# Prompts usados en el proyecto — Café Hondureño

**Trabajo:** Programación Web II — Grupo 2 (segundo parcial)
**Proyecto:** Página "El Universo del Café / Café Hondureño"
**Asistente de IA utilizado:** OpenCode

Este documento reúne los **prompts (peticiones) enviados durante el desarrollo**,
en orden cronológico y redactados tal cual se escribieron.

---

## Prompt 1 — Autenticación, Seguridad y JWT (9 de noviembre de 2026)

```text
ayudame a crear para una pagina que trata sobre el cafe los siguiente haslo de una manera facil para agregarlo a un trabajo ya iniciado: Autenticación, Seguridad y JWT (Obligatorio)

Endpoint de Login: Un endpoint (POST) que reciba credenciales, verifique en la base de datos y, si son válidas, emita un JWT.

Endpoint de Registro (Sign Up): Un endpoint (POST) para crear nuevos usuarios con la contraseña encriptada (usando herramientas como bcrypt).

Endpoint de Logout (Opcional/Simulado): Ya que JWT es stateless, explicar y documentar cómo se manejaría el cierre de sesión en el cliente (ej. borrando el token).

Protección de Rutas (Middleware): Implementar un middleware que verifique la validez del JWT en las cabeceras (Authorization: Bearer <token>). Al menos el 50% de las rutas de su API deben ser privadas (requerir token para acceder).
```

**Resultado:** API REST completa en la carpeta `backend/` con:
- `POST /api/auth/login` (verifica en MySQL y emite JWT)
- `POST /api/auth/registro` (contraseña encriptada con bcrypt)
- `POST /api/auth/logout` (simulado y documentado)
- Middleware `Authorization: Bearer <token>` (`src/middlewares/auth.js`)
- 8 de 13 rutas privadas (62 %)
- Roles `admin` y `cliente`, y la página conectada mediante `auth.js`

---

## Prompt 2 — Autenticación, Seguridad, JWT + Base de datos en Azure (11 de noviembre de 2026)

```text
ayudame a crear para una pagina que trata sobre el cafe los siguiente haslo de una manera facil para agregarlo a un trabajo ya iniciado: Autenticación, Seguridad y JWT (Obligatorio)

Endpoint de Login: Un endpoint (POST) que reciba credenciales, verifique en la base de datos y, si son válidas, emita un JWT.

Endpoint de Registro (Sign Up): Un endpoint (POST) para crear nuevos usuarios con la contraseña encriptada (usando herramientas como bcrypt).

Endpoint de Logout (Opcional/Simulado): Ya que JWT es stateless, explicar y documentar cómo se manejaría el cierre de sesión en el cliente (ej. borrando el token).

Protección de Rutas (Middleware): Implementar un middleware que verifique la validez del JWT en las cabeceras (Authorization: Bearer <token>). Al menos el 50% de las rutas de su API deben ser privadas (requerir token para acceder).

y como complemento crea la base de datos en azure
```

**Resultado:** conexión SSL/TLS para Azure Database for MySQL (`DB_SSL=true`),
guía completa en `backend/docs/AZURE.md` (Portal de Azure y Azure CLI),
plantilla `backend/.env.azure.example` y comando `npm run db:check`.

---

## Prompt 3 — Carpeta con los prompts (13 de noviembre de 2026)

```text
dame una carpeta con los promt que te pedí y llama la carpeta promt web
```

**Resultado:** esta carpeta `promt web`, con los prompts en archivos de texto
independientes y este índice.

---

### Contenido de esta carpeta

| Archivo | Contenido |
|---|---|
| `01-autenticacion-jwt.txt` | Prompt 1 (texto exacto) |
| `02-autenticacion-jwt-y-azure.txt` | Prompt 2 (texto exacto) |
| `03-carpeta-prompts.txt` | Prompt 3 (texto exacto) |
| `prompts.md` | Este índice con la explicación y resultados |
