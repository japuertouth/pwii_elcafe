# Café Hondureño · Fan page + API (Grupo 2)

Proyecto unificado de Programación Web II: la **fan page** (HTML, CSS y JavaScript) y la **API REST** (Node.js, Express 5, Sequelize, Azure SQL y JWT) viven en un solo repositorio y se despliegan juntas en **Vercel**.

```
cafe-hondureno/
├── public/            Fan page (lo que Vercel sirve como sitio estático)
│   ├── index.html, elcafe.html, galeria.html, curiosidades.html, contacto.html, cuenta.html, 404.html
│   ├── css/estilos.css      Una sola hoja de estilos para todo el sitio
│   ├── js/                  comun.js (tema, menú, sesión, API) + un archivo por página
│   ├── js/reglas.js         Reglas de validación compartidas con la API
│   ├── fuentes/             Tipografías alojadas en el sitio (licencia SIL OFL)
│   └── imagenes/
├── api/index.js       Punto de entrada de la API en Vercel (una función para todo /api/*)
├── backend/           Código de la API: config, controllers, middlewares, models, routes, services, utils, tests
├── docs/              Documentación de la API, colección de Postman, prototipos y evidencias de IA
├── vercel.json        Configuración de despliegue y cabeceras de seguridad
├── .env.example       Variables de entorno necesarias (copiar como .env)
└── package.json
```

## 1. Compatibilidad con Vercel

**Sí es compatible.** El sitio se publica como archivos estáticos en la CDN de Vercel y la API de Express corre como una **Vercel Function** (`api/index.js`). Como ambos comparten dominio, el navegador llama a `/api/...` sin configurar CORS.

Hay tres puntos a tener en cuenta:

| Punto | Qué pasa | Qué hacer |
|---|---|---|
| **Firewall de Azure SQL** | Las funciones de Vercel salen a internet con IPs que cambian. Azure SQL solo acepta las IPs de su lista. | Opción gratuita: en Azure → SQL server → Networking, agregar la regla `0.0.0.0 – 255.255.255.255` (la protección queda en el usuario/contraseña de la base y el cifrado TLS, que ya está activo). Opción de pago: **Static IPs** de Vercel (plan Pro, US$100/mes por proyecto) y agregar solo esas IPs. |
| **Límites de peticiones y bloqueo de cuentas** | Se guardan en la memoria de cada instancia de la función; si Vercel abre varias instancias, cada una cuenta por separado. | Suficiente para el proyecto. Para producción real, usar un almacén compartido (Upstash Redis) con `rate-limit-redis`. |
| **Arranque en frío** | La primera petición después de un rato abre la conexión a Azure (1–3 s; más si la base *serverless* de Azure estaba en pausa). | Nada que hacer; la función tiene hasta 30 s (`vercel.json`). |

**Alternativa recomendada si no quieres abrir el firewall:** como la base ya está en Azure, **Azure App Service** (plan gratuito F1 o B1) ejecuta este mismo proyecto con `npm start` y se conecta a Azure SQL activando *"Allow Azure services and resources to access this server"*. Render o Railway también funcionan con `npm start`, pero tienen el mismo problema de IPs que Vercel.

## 2. Ejecutar en local

Requisitos: Node.js 22 y acceso a la base de Azure SQL (tu IP debe estar permitida en el firewall).

```bash
npm install
cp .env.example .env        # en Windows: copy .env.example .env
# completa .env con los datos de la base y un JWT_SECRET largo
npm start
```

Abre `http://localhost:4000` (fan page) y `http://localhost:4000/api/salud` (estado de la API).

Para generar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Desplegar en Vercel

1. Sube esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye `.env` y `node_modules`).
2. En Vercel: **Add New → Project**, importa el repositorio. No cambies nada: `vercel.json` ya indica que no hay framework, que el sitio está en `public/` y que `/api/*` va a la función.
3. En **Settings → Environment Variables** agrega (para *Production* y *Preview*): `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (mínimo 32 caracteres), `JWT_EXPIRES_IN`, `ADMIN_ROL_ID`, `USUARIO_ROL_ID`, `BCRYPT_COSTO`.
4. Configura el firewall de Azure SQL como se explica en la sección 1.
5. **Deploy**. Comprueba `https://tu-proyecto.vercel.app/api/salud`: debe responder `"baseDeDatos": "ok"`.

Si falta alguna variable, el sitio sigue funcionando y la API responde `503` con un mensaje claro en lugar de fallar.

## 4. Seguridad aplicada

### Registro de usuarios

Las reglas están en `public/js/reglas.js` y las usan **el formulario y la API**, así que el navegador muestra exactamente los mismos errores que devolvería el servidor (y el servidor no confía en el navegador: vuelve a validar todo).

| Campo | Restricciones |
|---|---|
| Nombre | 2–100 caracteres; solo letras (con tildes y ñ), espacios, guiones, apóstrofos y puntos de abreviatura; sin números, HTML ni caracteres invisibles. |
| Correo | Formato estricto (`usuario@dominio.tld`): sin espacios, sin puntos dobles o al inicio/final, dominio válido, máximo 64 caracteres antes de la @ y 254 en total. Se rechazan correos temporales (mailinator, yopmail, etc.). Se guarda en minúsculas y debe ser único. |
| Contraseña | 10–64 caracteres con minúscula, mayúscula, número y símbolo; sin espacios al inicio o final; **no puede contener el nombre ni partes del correo** (también con sustituciones como `4→a`, `0→o`, `1→i`); no puede ser una contraseña común (lista con términos locales como *honduras*, *catracho*, *olimpia*); sin secuencias como `1234`, `abcd`, `qwer` o `aaaa`. |
| Confirmación | Debe coincidir con la contraseña. |
| Rol y estado | Siempre `usuario` y `activo`; se ignora cualquier `rol_id` o `activo` enviado por el cliente. |

### Autenticación y sesiones

- Contraseñas con **bcrypt** (costo 12 por defecto; los hashes antiguos de menor costo se actualizan solos al iniciar sesión).
- **JWT** firmado con HS256, con emisor, audiencia, `sub` e identificador único (`jti`); se rechazan otros algoritmos.
- En cada petición privada se consulta la base: si el usuario fue **desactivado**, **cambió su contraseña** o **cambió de rol**, el token anterior deja de valer al instante.
- **Cerrar sesión** revoca el token en el servidor.
- **Bloqueo temporal**: 5 intentos fallidos para un mismo correo bloquean el inicio de sesión 15 minutos (luego 30, 60…). Se aplica también a correos que no existen y la comparación tarda lo mismo en ambos casos, para no revelar qué cuentas están registradas.
- Cambiar el correo exige la contraseña actual; la contraseña nueva debe ser distinta de la anterior.
- En el navegador el token se guarda en `sessionStorage` (se borra al cerrar la pestaña).

### Protección de la API y del sitio

- **Límites de peticiones** por IP: 300 por 15 min en toda la API, 10 inicios de sesión por 15 min, 5 registros por hora, 5 mensajes de contacto por 10 min.
- Solo se acepta `application/json` (415 en otro caso), cuerpo máximo de 10 KB y se rechazan claves `__proto__`/`constructor` (contaminación de prototipos).
- Todos los textos se normalizan (Unicode NFKC) y se eliminan caracteres de control e invisibles.
- Consultas con Sequelize (parametrizadas); se corrigió la única consulta armada con texto en `verificar-azure.js`.
- **Cabeceras de seguridad** iguales en Express y en `vercel.json` (una prueba lo verifica): CSP estricta sin scripts ni estilos en línea, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP.
- **CORS** cerrado por defecto (mismo dominio); `*` se ignora en producción.
- Respuestas de la API con `Cache-Control: no-store`; errores internos sin detalles para el cliente; 503 claro si la base no responde.
- El frontend nunca inserta HTML recibido de la API (usa `textContent`) y solo acepta imágenes `https:` o del propio sitio.
- Formularios con **campo trampa** (honeypot) contra robots; el mensaje de contacto admite como máximo 2 enlaces.
- Tipografías alojadas en el propio sitio: no se envía información de los visitantes a terceros.

> **Importante:** el README anterior del backend tenía el usuario y la contraseña reales de Azure SQL. Ese archivo ya circuló, así que **cambien la contraseña de la base** en Azure y usen la nueva solo en `.env` y en Vercel.

## 5. Pruebas

```bash
npm test          # 59 pruebas: API completa (SQLite en memoria), seguridad y configuración de despliegue
npm run rutas     # lista de rutas públicas y privadas
npm run auditoria # vulnerabilidades conocidas en dependencias de producción (hoy: 0)
```

La documentación de cada endpoint está en `docs/API.md` y la colección de Postman en `docs/pruebas/`.

## 6. Equipo

Josue Alejandro Puerto Ulloa · Eduardo Alberto Meza · Nathaly Melissa Aguilar Gómez · Josse Armando Galeano · José Daniel Muñoz Cruz

Fotografías: Wikimedia Commons (ver `public/imagenes/CREDITOS.txt`). Tipografías: Big Shoulders Stencil Display y Atkinson Hyperlegible (SIL Open Font License).
