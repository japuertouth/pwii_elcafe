# Documentación de la API — Café Hondureño (Grupo 2)

API RESTful hecha con **Node.js + Express 5**, **Sequelize** (ORM) sobre **Azure SQL (SQL Server)** y autenticación con **JWT**.

- **URL base local:** `http://localhost:4000`
- **Formato:** JSON (`Content-Type: application/json`)
- **Rutas privadas:** cabecera `Authorization: Bearer <token>` (el token lo entrega el login)
- **Pruebas:** colección de Postman `pruebas/Cafe_Hondureno_API.postman_collection.json`

## 1. Estructura de las respuestas

Todas las respuestas usan la misma estructura:

| Caso | Estructura |
|---|---|
| Éxito | `{ "status": "success", "message": "...", "data": { ... }, "meta": { ... } }` (`message` y `meta` solo cuando aplican) |
| Error | `{ "status": "error", "message": "...", "errors": [ { "campo": "...", "mensaje": "..." } ] }` (`errors` solo en errores de validación) |

## 2. Códigos de estado

| Código | Cuándo se usa |
|---|---|
| `200 OK` | Lectura, actualización, eliminación, login y logout correctos |
| `201 Created` | Registro creado (registro de usuario, curiosidad, foto, categoría, región, mensaje). Incluye la cabecera `Location` |
| `400 Bad Request` | Datos inválidos, JSON mal formado, id con formato incorrecto o parámetros de búsqueda incorrectos |
| `401 Unauthorized` | Falta el token, es inválido o expiró; credenciales de login incorrectas |
| `403 Forbidden` | Token válido pero sin permiso (no es administrador, no es el autor, o la cuenta está desactivada) |
| `404 Not Found` | El registro o la ruta no existen |
| `409 Conflict` | Dato repetido (correo, categoría, región) o registro en uso que no se puede borrar |
| `415 Unsupported Media Type` | Se envió un cuerpo que no es `application/json` |
| `429 Too Many Requests` | Demasiadas peticiones desde la misma IP (10 logins/15 min, 5 registros/hora, 5 mensajes/10 min, 300 peticiones/15 min) o 5 intentos fallidos seguidos para un mismo correo (bloqueo de 15 min, progresivo) |
| `500 Internal Server Error` | Error inesperado del servidor (no se muestran detalles internos) |
| `503 Service Unavailable` | Falta configuración (variables de entorno) o no hay conexión con la base de datos |

## 3. Autenticación con JWT

1. El cliente se registra (`POST /api/auth/registro`) o inicia sesión (`POST /api/auth/login`) y recibe `data.token`.
2. Guarda el token (la fan page usa `sessionStorage.setItem('token', token)`) y lo envía en cada ruta privada: `Authorization: Bearer <token>`.
3. El middleware `verificarToken` valida la firma (solo HS256), el emisor, la audiencia y la expiración (por defecto **2 horas**), y consulta la base para confirmar que el usuario existe, está activo y no cambió su contraseña. Si falla responde `401` (o `403` si la cuenta está desactivada). El rol se toma de la base, no del token.
4. Las rutas de administración usan además `soloAdmin` (rol_id = `ADMIN_ROL_ID`). Si el usuario no es admin responde `403`.

**Contenido del token (payload):** `{ "id", "correo", "rol_id", "rol", "ver" }` más `iss`, `aud`, `sub`, `jti`, `iat` y `exp`, firmado con HS256 y la clave `JWT_SECRET` (mínimo 32 caracteres en producción). `ver` es una huella del hash de la contraseña: al cambiarla, los tokens anteriores dejan de valer. Nunca incluye la contraseña.

### Logout (cierre de sesión)

`POST /api/auth/logout` **revoca el token en el servidor** (lista de identificadores `jti` revocados hasta que expiran) y el cliente lo borra:

```js
await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
sessionStorage.removeItem('token');
```

La lista de revocados vive en memoria; en Vercel cada instancia tiene la suya, por eso el token además caduca a las pocas horas (`JWT_EXPIRES_IN`). Cambiar la contraseña invalida al instante todos los tokens anteriores.

## 4. Lista completa de endpoints

**37 rutas: 24 privadas (65 %)** — se puede comprobar con `npm run rutas`.

| Módulo | Método | Ruta | Acceso | Códigos |
|---|---|---|---|---|
| General | GET | `/api/salud` | Público | 200, 500 |
| Autenticación | POST | `/api/auth/registro` | Público | 201, 400, 409, 429 |
| Autenticación | POST | `/api/auth/login` | Público | 200, 400, 401, 403, 429 |
| Autenticación | POST | `/api/auth/logout` | 🔒 Token | 200, 401 |
| Autenticación | GET | `/api/auth/perfil` | 🔒 Token | 200, 401, 404 |
| Autenticación | PATCH | `/api/auth/perfil` | 🔒 Token | 200, 400, 401, 409 |
| Autenticación | PATCH | `/api/auth/password` | 🔒 Token | 200, 400, 401 |
| Usuarios | GET | `/api/usuarios` | 🔒 Admin | 200, 400, 401, 403 |
| Usuarios | GET | `/api/usuarios/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Usuarios | PATCH | `/api/usuarios/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Categorías | GET | `/api/categorias` | Público | 200, 400 |
| Categorías | GET | `/api/categorias/:id` | Público | 200, 400, 404 |
| Categorías | POST | `/api/categorias` | 🔒 Admin | 201, 400, 401, 403, 409 |
| Categorías | PUT | `/api/categorias/:id` | 🔒 Admin | 200, 400, 401, 403, 404, 409 |
| Categorías | DELETE | `/api/categorias/:id` | 🔒 Admin | 200, 400, 401, 403, 404, 409 |
| Regiones | GET | `/api/regiones` | Público | 200 |
| Regiones | GET | `/api/regiones/:id` | Público | 200, 400, 404 |
| Regiones | POST | `/api/regiones` | 🔒 Admin | 201, 400, 401, 403, 409 |
| Regiones | PUT | `/api/regiones/:id` | 🔒 Admin | 200, 400, 401, 403, 404, 409 |
| Regiones | DELETE | `/api/regiones/:id` | 🔒 Admin | 200, 400, 401, 403, 404, 409 |
| Curiosidades | GET | `/api/curiosidades` | Público | 200, 400 |
| Curiosidades | GET | `/api/curiosidades/aleatoria` | Público | 200, 400, 404 |
| Curiosidades | GET | `/api/curiosidades/:id` | Público | 200, 400, 404 |
| Curiosidades | POST | `/api/curiosidades` | 🔒 Token | 201, 400, 401 |
| Curiosidades | PUT | `/api/curiosidades/:id` | 🔒 Autor o admin | 200, 400, 401, 403, 404 |
| Curiosidades | PATCH | `/api/curiosidades/:id` | 🔒 Autor o admin | 200, 400, 401, 403, 404 |
| Curiosidades | DELETE | `/api/curiosidades/:id` | 🔒 Autor o admin | 200, 400, 401, 403, 404 |
| Galería | GET | `/api/galeria` | Público | 200, 400 |
| Galería | GET | `/api/galeria/:id` | Público | 200, 400, 404 |
| Galería | POST | `/api/galeria` | 🔒 Admin | 201, 400, 401, 403 |
| Galería | PUT | `/api/galeria/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Galería | DELETE | `/api/galeria/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Contacto | POST | `/api/contacto` | Público (token opcional) | 201, 400, 401 |
| Contacto | GET | `/api/contacto` | 🔒 Admin | 200, 400, 401, 403 |
| Contacto | GET | `/api/contacto/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Contacto | PATCH | `/api/contacto/:id/leido` | 🔒 Admin | 200, 400, 401, 403, 404 |
| Contacto | DELETE | `/api/contacto/:id` | 🔒 Admin | 200, 400, 401, 403, 404 |

## 5. Pantallas del diseño y endpoints que usan

Relación entre la fan page del primer parcial (`diseno/fan_page`), los prototipos del segundo parcial (`diseno/prototipo_acceso` y `diseno/prototipo_contenido`) y la API.

| Pantalla / página | Acción | Endpoint |
|---|---|---|
| Iniciar sesión | Enviar correo y contraseña | `POST /api/auth/login` |
| Crear cuenta | Enviar nombre, correo y contraseña | `POST /api/auth/registro` |
| Cerrar sesión | Borrar el token del cliente (y confirmar) | `POST /api/auth/logout` |
| Lista de curiosidades | Cargar la tabla con filtros y paginación | `GET /api/curiosidades?categoria_id=&region_id=&q=&page=&limit=` |
| Lista de curiosidades | Llenar los filtros de categoría y región | `GET /api/categorias?tipo=curiosidad` · `GET /api/regiones` |
| Detalle de curiosidad | Ver una curiosidad con categoría, región y autor | `GET /api/curiosidades/:id` |
| Crear curiosidad | Guardar el formulario | `POST /api/curiosidades` |
| Editar curiosidad | Cargar valores y guardar cambios | `GET /api/curiosidades/:id` → `PUT /api/curiosidades/:id` (o `PATCH`) |
| Lista de curiosidades | Eliminar una curiosidad | `DELETE /api/curiosidades/:id` |
| Página Curiosidades | Botón "Mostrar otra curiosidad" | `GET /api/curiosidades/aleatoria?excluir=:id` |
| Formulario de contacto | Enviar mensaje | `POST /api/contacto` |
| Bandeja de mensajes | Listar mensajes (filtro leído / no leído) | `GET /api/contacto?leido=false` |
| Bandeja de mensajes | Ver y marcar como leído | `GET /api/contacto/:id` · `PATCH /api/contacto/:id/leido` |
| Bandeja de mensajes | Eliminar mensaje | `DELETE /api/contacto/:id` |
| Página de inicio — "Las 6 regiones del café" | Botones y detalle de cada región | `GET /api/regiones` · `GET /api/regiones/:id` |
| Página Galería | Mostrar las fotos | `GET /api/galeria` |
| Panel de administración | Gestionar categorías, regiones, galería y usuarios | Rutas 🔒 Admin de la tabla anterior |

### Datos de la fan page en la API

| Fan page | Dato en la página | Campo en la API |
|---|---|---|
| Inicio — "Las 6 regiones del café" | `nombre`, `departamentos`, `descripcion` | `nombre`, `departamentos`, `descripcion` |
| Inicio — "Las 6 regiones del café" | `altura` | `altitud` |
| Inicio — "Las 6 regiones del café" | `notas` (lista) | `perfil_taza` (texto separado por comas: `perfil_taza.split(', ')`) |
| Curiosidades | `tema` (economia, historia, cultivo, cultura) | `categoria.nombre` (Cifras, Historia, Cultivo, Costumbres); filtro `?categoria=Historia` |
| Curiosidades | `titulo`, `texto` | `titulo`, `descripcion` |
| Curiosidades | `icono` | Se asigna en el frontend según la categoría |
| Curiosidades | "¿Mito o realidad?" | Contenido fijo de la página (no tiene tabla en la base) |
| Galería | `data-category` (paisajes, cultivo, granos, preparacion, cultura, regiones) | `categoria` de tipo `galeria` (Paisajes cafetaleros, Cultivo y cosecha, Granos de café, Preparación del café, Cultura cafetalera, Regiones productoras) |
| Galería | imagen, título y descripción de cada tarjeta | `imagen_url`, `titulo`, `descripcion` |
| Contacto | `nombre`, `correo`, `asunto`, `mensaje` | Mismos campos y mismos valores de `asunto` |
| El Café | Guía de historia, variedades, tueste y preparación | Contenido fijo de la página |

La base de Azure contiene las 6 regiones, las 6 categorías de galería, las 4 categorías de curiosidades, 9 fotos y 17 curiosidades de la fan page.

## 6. Detalle por módulo

### 6.1 Autenticación — `/api/auth`

| Endpoint | Cuerpo | Reglas |
|---|---|---|
| `POST /registro` | `{ nombre, correo, password, confirmar_password? }` | Nombre 2–100 solo con letras, espacios, guiones, apóstrofos y puntos. Correo con formato estricto, no temporal y único. Contraseña de 10–64 caracteres con minúscula, mayúscula, número y símbolo, **sin el nombre ni partes del correo**, no común y sin secuencias (`1234`, `abcd`, `aaaa`). Reglas en `public/js/reglas.js` (las mismas del formulario). El rol siempre es **usuario** y la cuenta queda activa (se ignoran `rol_id` y `activo` del cliente) |
| `POST /login` | `{ correo, password }` | Mismo mensaje y mismo tiempo de respuesta si el correo no existe o la contraseña es incorrecta (no revela qué cuentas existen). 5 fallos seguidos → 429 durante 15 min. Cuenta desactivada → 403 |
| `PATCH /perfil` | `{ nombre?, correo?, password_actual? }` | Al menos un campo; cambiar el correo exige `password_actual`; el correo no puede estar en uso |
| `PATCH /password` | `{ password_actual, password_nueva }` | Verifica la actual con bcrypt; la nueva sigue las reglas del registro y debe ser distinta. Devuelve un **token nuevo** (el anterior deja de valer) |

La contraseña se guarda **encriptada con bcrypt** (`password_hash`) y nunca se devuelve en las respuestas.

Petición:

```http
POST /api/auth/registro
Content-Type: application/json

{
  "nombre": "Usuario de Prueba",
  "correo": "prueba1794533209069@correo.com",
  "password": "Grano#Rojo2026"
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "message": "Usuario registrado correctamente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...(token oculto)",
    "tipo": "Bearer",
    "expira_en": "1h",
    "usuario": {
      "id": 3,
      "nombre": "Usuario de Prueba",
      "correo": "prueba1794533209069@correo.com",
      "rol_id": 2,
      "rol": "usuario",
      "activo": true,
      "creado_en": "2026-11-13T01:26:49.092Z",
      "actualizado_en": "2026-11-13T01:26:49.092Z"
    }
  }
}
```

Petición:

```http
POST /api/auth/login
Content-Type: application/json

{
  "correo": "prueba1794533209069@correo.com",
  "password": "Grano#Rojo2026"
}
```

Respuesta `200`:

```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...(token oculto)",
    "tipo": "Bearer",
    "expira_en": "1h",
    "usuario": {
      "id": 3,
      "nombre": "Usuario de Prueba",
      "correo": "prueba1794533209069@correo.com",
      "rol_id": 2,
      "rol": "usuario",
      "activo": true,
      "creado_en": "2026-11-13T01:26:49.092Z",
      "actualizado_en": "2026-11-13T01:26:49.092Z"
    }
  }
}
```

Petición:

```http
POST /api/auth/registro
Content-Type: application/json

{
  "nombre": "",
  "correo": "no-es-un-correo",
  "password": "123"
}
```

Respuesta `400`:

```json
{
  "status": "error",
  "message": "Datos inválidos",
  "errors": [
    {
      "campo": "nombre",
      "mensaje": "El nombre es obligatorio y debe ser texto"
    },
    {
      "campo": "correo",
      "mensaje": "El correo no tiene un formato válido"
    },
    {
      "campo": "password",
      "mensaje": "La contraseña debe tener entre 8 y 72 caracteres"
    }
  ]
}
```

Petición: `GET /api/auth/perfil`

Respuesta `401`:

```json
{
  "status": "error",
  "message": "Acceso denegado: falta el token. Envía Authorization: Bearer <token>"
}
```

Petición: `POST /api/auth/logout` (con token)

Respuesta `200`:

```json
{
  "status": "success",
  "message": "Sesión cerrada. Elimina el token en el cliente",
  "data": {
    "instrucciones": "El token quedó revocado en el servidor. Bórralo también en el cliente, por ejemplo: sessionStorage.removeItem('token') o localStorage.removeItem('token').",
    "expira_en": "1h"
  }
}
```


### 6.2 Curiosidades — `/api/curiosidades` (CRUD principal)

Cuerpo: `{ titulo, descripcion, categoria_id, region_id? }`.
`categoria_id` debe ser de tipo `curiosidad`; `creado_por` se toma del token. Solo el autor o un administrador pueden editar o borrar.

Petición:

```http
POST /api/curiosidades
Authorization: Bearer <token>
Content-Type: application/json

{
  "titulo": "[PRUEBA] El café nace dentro de una cereza",
  "descripcion": "Cada cereza de café guarda normalmente dos semillas: los granos que luego se tuestan.",
  "categoria_id": 2,
  "region_id": 3
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "message": "Curiosidad creada correctamente",
  "data": {
    "id": 1,
    "titulo": "[PRUEBA] El café nace dentro de una cereza",
    "descripcion": "Cada cereza de café guarda normalmente dos semillas: los granos que luego se tuestan.",
    "categoria_id": 2,
    "region_id": 3,
    "creado_por": 3,
    "creado_en": "2026-11-13T01:26:49.163Z",
    "actualizado_en": "2026-11-13T01:26:49.163Z",
    "categoria": {
      "id": 2,
      "nombre": "Economía",
      "tipo": "curiosidad"
    },
    "region": {
      "id": 3,
      "nombre": "Región de prueba 209139"
    },
    "autor": {
      "id": 3,
      "nombre": "Usuario de Prueba (editado)"
    }
  }
}
```

Petición:

```http
POST /api/curiosidades
Content-Type: application/json

{
  "titulo": "Sin token",
  "descripcion": "No debe guardarse",
  "categoria_id": 2
}
```

Respuesta `401`:

```json
{
  "status": "error",
  "message": "Acceso denegado: falta el token. Envía Authorization: Bearer <token>"
}
```

Petición: `GET /api/curiosidades/1`

Respuesta `404`:

```json
{
  "status": "error",
  "message": "Curiosidad no encontrada"
}
```


### 6.3 Categorías — `/api/categorias`

Cuerpo: `{ nombre (máx. 60), tipo: "curiosidad" | "galeria" }`. La combinación nombre + tipo es única (409).
No se puede borrar ni cambiar el tipo de una categoría con curiosidades o fotos (409). Filtro: `?tipo=curiosidad`.

Petición: `GET /api/categorias?tipo=curiosidad`

Respuesta `200`:

```json
{
  "status": "success",
  "data": [
    {
      "id": 2,
      "nombre": "Economía",
      "tipo": "curiosidad"
    },
    {
      "id": 1,
      "nombre": "Historia",
      "tipo": "curiosidad"
    }
  ],
  "meta": {
    "total": 2
  }
}
```


### 6.4 Regiones — `/api/regiones`

Cuerpo: `{ nombre (único, máx. 60), departamentos?, altitud?, perfil_taza?, descripcion?, imagen_url? }`.
En `PUT` los campos opcionales que no se envían quedan en `null`.

Petición:

```http
POST /api/regiones
Authorization: Bearer <token>
Content-Type: application/json

{
  "nombre": "Región de prueba 209139",
  "departamentos": "Olancho",
  "altitud": "1,000 - 1,400 msnm",
  "perfil_taza": "Notas tropicales y cuerpo medio",
  "descripcion": "Región creada por la colección de pruebas."
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "message": "Región creada correctamente",
  "data": {
    "id": 3,
    "nombre": "Región de prueba 209139",
    "departamentos": "Olancho",
    "altitud": "1,000 - 1,400 msnm",
    "perfil_taza": "Notas tropicales y cuerpo medio",
    "descripcion": "Región creada por la colección de pruebas."
  }
}
```


### 6.5 Galería — `/api/galeria`

Cuerpo: `{ titulo (máx. 120), descripcion? (máx. 400), imagen_url (URL http(s) o ruta relativa, máx. 300), categoria_id (tipo galeria), region_id? }`.
`subido_por` se toma del token. Filtros: `?categoria_id=&region_id=&page=&limit=` (12 por página por defecto).

Petición:

```http
POST /api/galeria
Authorization: Bearer <token>
Content-Type: application/json

{
  "titulo": "[PRUEBA] Cafetal al amanecer",
  "descripcion": "Foto de prueba creada por la colección.",
  "imagen_url": "imagenes/marcala.jpg",
  "categoria_id": 4,
  "region_id": 3
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "message": "Foto creada correctamente",
  "data": {
    "id": 1,
    "titulo": "[PRUEBA] Cafetal al amanecer",
    "descripcion": "Foto de prueba creada por la colección.",
    "imagen_url": "imagenes/marcala.jpg",
    "categoria_id": 4,
    "region_id": 3,
    "subido_por": 1,
    "creado_en": "2026-11-13T01:26:49.192Z",
    "categoria": {
      "id": 4,
      "nombre": "Prueba 209139 (editada)",
      "tipo": "galeria"
    },
    "region": {
      "id": 3,
      "nombre": "Región de prueba 209139"
    },
    "autor": {
      "id": 1,
      "nombre": "Administrador"
    }
  }
}
```


### 6.6 Contacto — `/api/contacto`

Cuerpo: `{ nombre (máx. 100), correo, asunto: "informacion" | "productos" | "sugerencia" | "otro", mensaje (máx. 1000) }` — los mismos campos del formulario de `contacto.html`.
Si el visitante envía su token, se guarda `usuario_id`; si no, queda en `null`. `meta.sinLeer` indica cuántos mensajes faltan por leer.

Petición:

```http
POST /api/contacto
Content-Type: application/json

{
  "nombre": "Visitante de prueba",
  "correo": "visitante@correo.com",
  "asunto": "informacion",
  "mensaje": "[PRUEBA] ¿Dónde puedo comprar café de Marcala?"
}
```

Respuesta `201`:

```json
{
  "status": "success",
  "message": "Mensaje enviado correctamente. ¡Gracias por escribirnos!",
  "data": {
    "id": 1,
    "nombre": "Visitante de prueba",
    "correo": "visitante@correo.com",
    "asunto": "informacion",
    "mensaje": "[PRUEBA] ¿Dónde puedo comprar café de Marcala?",
    "usuario_id": null,
    "leido": false,
    "creado_en": "2026-11-13T01:26:49.205Z",
    "usuario": null
  }
}
```

Petición: `GET /api/contacto` (con token)

Respuesta `403`:

```json
{
  "status": "error",
  "message": "Solo un administrador puede realizar esta acción"
}
```

Petición:

```http
PATCH /api/contacto/1/leido
Authorization: Bearer <token>
Content-Type: application/json

{
  "leido": true
}
```

Respuesta `200`:

```json
{
  "status": "success",
  "message": "Mensaje marcado como leído",
  "data": {
    "id": 1,
    "nombre": "Visitante de prueba",
    "correo": "visitante@correo.com",
    "asunto": "informacion",
    "mensaje": "[PRUEBA] ¿Dónde puedo comprar café de Marcala?",
    "usuario_id": null,
    "leido": true,
    "creado_en": "2026-11-13T01:26:49.205Z",
    "usuario": null
  }
}
```


### 6.7 Usuarios — `/api/usuarios` (solo administradores)

`PATCH /api/usuarios/:id` acepta `{ rol_id?, activo? }`. Un administrador no puede desactivarse ni quitarse el rol a sí mismo.
Filtros del listado: `?q=&rol_id=&activo=&page=&limit=`.

Petición:

```http
PATCH /api/usuarios/3
Authorization: Bearer <token>
Content-Type: application/json

{
  "activo": false
}
```

Respuesta `200`:

```json
{
  "status": "success",
  "message": "Usuario actualizado correctamente",
  "data": {
    "id": 3,
    "nombre": "Usuario de Prueba (editado)",
    "correo": "prueba1794533209069@correo.com",
    "rol_id": 2,
    "rol": "usuario",
    "activo": false,
    "creado_en": "2026-11-13T01:26:49.092Z",
    "actualizado_en": "2026-11-13T01:26:49.227Z"
  }
}
```


## 7. Documentación de las pruebas

| Prueba | Archivo | Resultado |
|---|---|---|
| Pruebas automáticas (`npm test`) | `backend/tests/` | **46 pruebas**: 22 del CRUD de curiosidades (modelos simulados) + 24 de integración de toda la API (base SQLite con las mismas tablas) |
| Verificación de la base real (solo lectura) | `npm run verificar:azure` | Conexión correcta; las 7 tablas tienen todas las columnas de los modelos; roles 1 = admin y 2 = usuario |
| Recorrido completo **contra Azure SQL** | `pruebas/resultados/resultados_azure.html` (Newman) | **59 de 59 peticiones y 118 de 118 verificaciones correctas** |

## 8. Información del proyecto

**Integrantes:** Josue Alejandro Puerto Ulloa · Eduardo Alberto Meza · Nathaly Melissa Aguilar Gomez · Josse Armando Galeano · Jose Daniel Muñoz Cruz

### 8.1 Contenido de la entrega

| Carpeta / archivo | Contenido |
|---|---|
| `backend/` | Código fuente de la API |
| `docs/API.md` | Documentación de todos los endpoints, códigos de estado, ejemplos y relación pantalla → endpoint |
| `pruebas/Cafe_Hondureno_API.postman_collection.json` | Colección de Postman con las 59 peticiones configuradas, pruebas automáticas y respuestas de ejemplo |
| `pruebas/resultados/resultados_azure.html` | Resultado de la colección ejecutada contra Azure (cada petición con su respuesta) |
| `diseno/fan_page/` | Fan page del primer parcial (diseño base de la aplicación) |
| `diseno/prototipo_acceso/` | Prototipo de inicio de sesión, registro y panel de administración |
| `diseno/prototipo_contenido/` | Prototipo de gestión de curiosidades y mensajes de contacto, con su documentación |
| `evidencia_IA/` | Prompts y chats del uso de IA generativa |

### 8.2 Arquitectura en capas

```
backend/
├── server.js
├── src/app.js
├── config/database.js
├── models/
├── services/
├── controllers/
├── routes/
├── middlewares/
├── utils/
├── scripts/
└── tests/
```

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `routes/` | Verbo HTTP + URL + middlewares (`routes/index.js` monta todas) |
| Controladores | `controllers/` | Reciben la petición, llaman al servicio y responden con el código HTTP |
| Servicios | `services/` | Validaciones y reglas de negocio |
| Acceso a datos | `models/` + `config/database.js` | Modelos Sequelize de las 7 tablas y conexión a Azure SQL |
| Middlewares | `middlewares/` | Verificación del JWT (`verificarToken`), rol administrador (`soloAdmin`), token opcional, límite de intentos y manejo de errores |
| Utilidades | `utils/` | Formato de respuesta, errores y validaciones comunes |

Flujo de una petición: **ruta → middlewares → controlador → servicio → modelo → Azure SQL**.

### 8.3 Scripts del backend

| Comando | Qué hace |
|---|---|
| `npm start` | Levanta la API |
| `npm run dev` | Levanta la API y la reinicia al guardar cambios |
| `npm test` | Ejecuta las 46 pruebas automáticas (no usa Azure) |
| `npm run rutas` | Lista las rutas y el porcentaje de rutas privadas |
| `npm run verificar:azure` | Verifica conexión, tablas y columnas de la base real (solo lectura) |
| `npm run crear:admin -- correo@ejemplo.com` | Convierte en administrador a un usuario ya registrado |
| `npm run restablecer:password -- correo@ejemplo.com NuevaClave123` | Cambia la contraseña de un usuario (se guarda encriptada con bcrypt) |

### 8.4 Tablas y relaciones

| Tabla | Relación |
|---|---|
| `roles` | — |
| `usuarios` | `rol_id` → `roles` |
| `regiones` | — |
| `categorias` | `tipo`: `curiosidad` o `galeria` |
| `curiosidades` | → `categorias`, `regiones`, `usuarios` (autor) |
| `galeria` | → `categorias`, `regiones`, `usuarios` (quien la subió) |
| `mensajes_contacto` | → `usuarios` (opcional) |

### 8.5 Primer administrador

El registro siempre crea usuarios con rol `usuario`, para que nadie pueda registrarse como administrador. Para tener un administrador:

1. Registra la cuenta con `POST /api/auth/registro`.
2. Ejecuta `npm run crear:admin -- correo@ejemplo.com`.
3. Inicia sesión de nuevo para obtener un token con el rol actualizado.

### 8.6 Cumplimiento del enunciado

| Requisito | Dónde se cumple |
|---|---|
| Node.js + Express | `package.json`, `backend/src/app.js` |
| Arquitectura en capas | `routes/` → `controllers/` → `services/` → `models/` |
| Variables de entorno | `.env.example` |
| Base relacional + ORM | Azure SQL + Sequelize |
| Usuarios + al menos 2 tablas relacionadas | 7 tablas (sección 8.4) |
| Login que emite JWT | `POST /api/auth/login` |
| Registro con bcrypt | `POST /api/auth/registro` |
| Logout documentado | Sección 3 de este documento |
| Middleware JWT con al menos 50 % de rutas privadas | `verificarToken`: 24 de 37 rutas privadas (65 %) |
| CRUD completo | `/api/curiosidades` (también categorías, regiones y galería) |
| Verbos HTTP | GET, POST, PUT, PATCH y DELETE |
| Códigos 200, 201, 400, 401, 404 y 500 | Sección 2 de este documento |
| JSON consistente | `{ status, message, data, meta }` en todas las respuestas |
| Diseño de la aplicación | `public/` (fan page) y `docs/prototipos/` |
| Pruebas documentadas | `docs/pruebas/` y `npm test` (59 pruebas) |
| README | `README.md` (arranque del servidor y conexión a la base) |
| Evidencia de IA | `docs/evidencia_IA/` |
