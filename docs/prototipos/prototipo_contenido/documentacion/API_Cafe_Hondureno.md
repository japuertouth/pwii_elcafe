# Documentación de API — Café Hondureño

## 1. Objetivo

Documentar las operaciones de curiosidades y mensajes de contacto utilizadas por las pantallas del sistema.

## 2. Modelo de datos

### Curiosidades

| Campo | Descripción |
|---|---|
| id | Identificador |
| titulo | Título de la curiosidad |
| descripcion | Descripción |
| categoria_id | Categoría |
| region_id | Región asociada |
| creado_por | Usuario que creó el registro |
| creado_en | Fecha de creación |
| actualizado_en | Fecha de actualización |

### Mensajes de contacto

| Campo | Descripción |
|---|---|
| id | Identificador |
| nombre | Nombre del remitente |
| correo | Correo electrónico |
| asunto | informacion, productos, sugerencia u otro |
| mensaje | Contenido del mensaje |
| usuario_id | Usuario relacionado |
| leido | Estado de lectura |
| creado_en | Fecha de recepción |

## 3. Pantallas y endpoints

| Pantalla | Método | Endpoint |
|---|---|---|
| Iniciar sesión | POST | `/api/auth/login` |
| Crear cuenta | POST | `/api/auth/registro` |
| Cerrar sesión | POST | `/api/auth/logout` |
| Lista de curiosidades | GET | `/api/curiosidades?categoria_id=&region_id=&q=&page=&limit=` |
| Filtros de la lista y del formulario | GET | `/api/categorias?tipo=curiosidad` · `/api/regiones` |
| Detalle de curiosidad | GET | `/api/curiosidades/:id` |
| Crear curiosidad | POST | `/api/curiosidades` |
| Editar curiosidad | PUT | `/api/curiosidades/:id` |
| Eliminar curiosidad | DELETE | `/api/curiosidades/:id` |
| Curiosidad aleatoria (página Curiosidades) | GET | `/api/curiosidades/aleatoria` |
| Formulario de contacto | POST | `/api/contacto` |
| Bandeja de mensajes | GET | `/api/contacto?leido=false` |
| Marcar mensaje como leído | PATCH | `/api/contacto/:id/leido` |
| Eliminar mensaje | DELETE | `/api/contacto/:id` |
| Regiones (página de inicio) | GET | `/api/regiones` |
| Galería | GET | `/api/galeria` |

La documentación completa de cada endpoint está en `docs/API.md`.

## 4. Campos de los formularios

### Crear y editar curiosidad

- titulo
- descripcion
- categoria_id
- region_id

### Formulario de contacto

- nombre
- correo
- asunto
- mensaje

## 5. Autenticación y permisos

Las operaciones administrativas requieren autenticación y permisos de administrador.

El formulario de contacto está disponible para visitantes. El usuario relacionado es opcional.

## 6. Códigos de respuesta HTTP

| Código | Descripción |
|---|---|
| 200 | Operación correcta |
| 201 | Registro creado |
| 400 | Datos inválidos |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | Registro no encontrado |
| 500 | Error interno |
