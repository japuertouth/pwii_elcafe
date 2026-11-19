const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

try {
  require('sqlite3');
} catch (error) {
  test('Pruebas de integración de toda la API', { skip: `sqlite3 no está disponible en este equipo (${error.message.split('\n')[0]})` }, () => {});
  return;
}

const { prepararBase, levantarServidor, modelos, CREDENCIALES } = require('./helpers/baseDePruebas');

let servidor;
let api;
let baseUrl;
const base = () => baseUrl;
const t = {};

test.before(async () => {
  await prepararBase();
  ({ servidor, api, base: baseUrl } = await levantarServidor());
});
test.after(() => servidor && servidor.close());

function estructura(r, status) {
  assert.equal(r.status, status, `se esperaba ${status} y llegó ${r.status}: ${JSON.stringify(r.json)}`);
  if (r.json === null) return;
  if (status < 400) {
    assert.equal(r.json.status, 'success');
    assert.ok('data' in r.json, 'falta "data"');
  } else {
    assert.equal(r.json.status, 'error');
    assert.equal(typeof r.json.message, 'string');
  }
}

test('GET /api/salud responde 200 con conexión a la base', async () => {
  const r = await api('GET', '/api/salud');
  estructura(r, 200);
  assert.equal(r.json.data.baseDeDatos, 'ok');
});

test('Ruta inexistente -> 404 con JSON uniforme', async () => {
  estructura(await api('GET', '/api/no-existe'), 404);
});

test('JSON mal formado -> 400', async () => {
  estructura(await api('POST', '/api/auth/login', { crudo: '{"correo": ' }), 400);
});

test('Registro: 201, contraseña guardada con bcrypt y rol usuario (aunque se envíe otro)', async () => {
  const r = await api('POST', '/api/auth/registro', {
    body: { nombre: 'Carlos Mejía', correo: 'Carlos@Correo.com', password: 'Tostado#2026xy', rol_id: 1, activo: false },
  });
  estructura(r, 201);
  assert.equal(r.json.data.usuario.correo, 'carlos@correo.com');
  assert.equal(r.json.data.usuario.rol, 'usuario');
  assert.equal(r.json.data.usuario.activo, true, 'no se debe poder registrar con campos no permitidos');
  assert.equal(r.json.data.usuario.password_hash, undefined);
  assert.equal(typeof r.json.data.token, 'string');
  const fila = await modelos.Usuario.findOne({ where: { correo: 'carlos@correo.com' } });
  assert.match(fila.password_hash, /^\$2[aby]\$/);
  assert.equal(fila.rol_id, 2);
  t.carlos = r.json.data.token;
});

test('Registro: datos inválidos -> 400 con detalle por campo', async () => {
  const r = await api('POST', '/api/auth/registro', { body: { nombre: '', correo: 'no-es-correo', password: '123' } });
  estructura(r, 400);
  const campos = r.json.errors.map((e) => e.campo).sort();
  assert.deepEqual(campos, ['correo', 'nombre', 'password']);
});

test('Registro: correo repetido -> 409', async () => {
  const r = await api('POST', '/api/auth/registro', { body: { nombre: 'Otra', correo: CREDENCIALES.usuario.correo, password: 'Grano#Rojo2026' } });
  estructura(r, 409);
});

test('Registro: rechaza correos con formato incorrecto o temporales', async () => {
  const malos = ['ana@@correo.com', 'ana@correo', 'ana..perez@correo.com', '.ana@correo.com', 'ana perez@correo.com',
    'ana@-correo.com', 'ana@correo.c', '<script>@correo.com', 'ana@mailinator.com', 'a'.repeat(65) + '@correo.com'];
  for (const correo of malos) {
    const r = await api('POST', '/api/auth/registro', { body: { nombre: 'Ana Reyes', correo, password: 'Grano#Rojo2026' } });
    estructura(r, 400);
    assert.deepEqual(r.json.errors.map((e) => e.campo), ['correo'], `debió rechazar el correo ${correo}`);
  }
});

test('Registro: la contraseña no puede incluir el nombre ni el correo del usuario', async () => {
  const casos = [
    { nombre: 'Lucía Fernández', correo: 'lucia.f@correo.com', password: 'Lucia#2026xy' },
    { nombre: 'Lucía Fernández', correo: 'lucia.f@correo.com', password: 'xFernandez#26' },
    { nombre: 'Lucía Fernández', correo: 'lfz.cafe@correo.com', password: 'Mi#lfzcafe26' },
    { nombre: 'Lucía Fernández', correo: 'lucia.f@correo.com', password: 'Luc1a#Grano26' },
  ];
  for (const body of casos) {
    const r = await api('POST', '/api/auth/registro', { body });
    estructura(r, 400);
    assert.equal(r.json.errors[0].campo, 'password');
    assert.match(r.json.errors[0].mensaje, /nombre ni tu correo/, body.password);
  }
});

test('Registro: rechaza contraseñas débiles, comunes o con secuencias', async () => {
  const debiles = ['corta#1A', 'sinmayuscula#2026', 'SINMINUSCULA#2026', 'SinNumeros#Cafe', 'SinSimbolo2026x',
    'Password2026!', 'P@ssw0rd2026', 'Honduras#2026', 'Cafe#1234xyz', 'Graaaano#2026', ' Espacio#2026x'];
  for (const password of debiles) {
    const r = await api('POST', '/api/auth/registro', { body: { nombre: 'Pedro Ruiz', correo: 'pedro@correo.com', password } });
    estructura(r, 400);
    assert.equal(r.json.errors[0].campo, 'password', `debió rechazar ${JSON.stringify(password)}`);
  }
});

test('Registro: rechaza nombres con símbolos o HTML y confirmación distinta', async () => {
  for (const nombre of ['<script>alert(1)</script>', 'Juan123', 'A', 'Ana  --  Pérez', 'x'.repeat(101)]) {
    const r = await api('POST', '/api/auth/registro', { body: { nombre, correo: 'nuevo@correo.com', password: 'Grano#Rojo2026' } });
    estructura(r, 400);
    assert.equal(r.json.errors[0].campo, 'nombre', `debió rechazar el nombre ${nombre}`);
  }
  const r = await api('POST', '/api/auth/registro', {
    body: { nombre: 'Pedro Ruiz', correo: 'pedro@correo.com', password: 'Grano#Rojo2026', confirmar_password: 'Grano#Rojo2025' },
  });
  estructura(r, 400);
  assert.equal(r.json.errors[0].campo, 'confirmar_password');
});

test('Seguridad: JSON con __proto__ -> 400 y contenido que no es JSON -> 415', async () => {
  estructura(await api('POST', '/api/auth/login', { crudo: '{"__proto__": {"admin": true}, "correo": "a@b.com", "password": "x"}' }), 400);
  const r = await fetch(`${base()}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'correo=a' });
  assert.equal(r.status, 415);
});

test('Seguridad: cabeceras de protección en las respuestas', async () => {
  const r = await api('GET', '/api/salud');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('Login: correcto -> 200 con token cuyo payload cumple el contrato { id, correo, rol_id, rol }', async () => {
  const r = await api('POST', '/api/auth/login', { body: CREDENCIALES.admin });
  estructura(r, 200);
  const payload = jwt.verify(r.json.data.token, process.env.JWT_SECRET);
  assert.equal(payload.id, 1);
  assert.equal(payload.correo, CREDENCIALES.admin.correo);
  assert.equal(payload.rol_id, 1);
  assert.equal(payload.rol, 'admin');
  t.admin = r.json.data.token;
  t.usuario = (await api('POST', '/api/auth/login', { body: CREDENCIALES.usuario })).json.data.token;
});

test('Login: contraseña incorrecta o correo inexistente -> 401 con el mismo mensaje', async () => {
  const a = await api('POST', '/api/auth/login', { body: { correo: CREDENCIALES.admin.correo, password: 'Incorrecta1' } });
  const b = await api('POST', '/api/auth/login', { body: { correo: 'nadie@correo.com', password: 'Incorrecta1' } });
  estructura(a, 401);
  estructura(b, 401);
  assert.equal(a.json.message, b.json.message);
});

test('Login: faltan datos -> 400', async () => {
  estructura(await api('POST', '/api/auth/login', { body: {} }), 400);
});

test('Perfil: sin token 401, token falso 401, token expirado 401, con token 200', async () => {
  estructura(await api('GET', '/api/auth/perfil'), 401);
  estructura(await api('GET', '/api/auth/perfil', { token: 'falso' }), 401);
  const expirado = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
  estructura(await api('GET', '/api/auth/perfil', { token: expirado }), 401);
  const r = await api('GET', '/api/auth/perfil', { token: t.usuario });
  estructura(r, 200);
  assert.equal(r.json.data.correo, CREDENCIALES.usuario.correo);
});

test('Perfil: actualizar nombre (200) y correo en uso (409)', async () => {
  const r = await api('PATCH', '/api/auth/perfil', { token: t.carlos, body: { nombre: 'Carlos E. Mejía' } });
  estructura(r, 200);
  assert.equal(r.json.data.nombre, 'Carlos E. Mejía');
  estructura(await api('PATCH', '/api/auth/perfil', { token: t.carlos, body: { correo: CREDENCIALES.admin.correo } }), 400);
  estructura(await api('PATCH', '/api/auth/perfil', { token: t.carlos, body: { correo: CREDENCIALES.admin.correo, password_actual: 'Tostado#2026xy' } }), 409);
  estructura(await api('PATCH', '/api/auth/perfil', { token: t.carlos, body: {} }), 400);
});

test('Cambiar contraseña: actual incorrecta 400; correcta 200 y el login usa la nueva', async () => {
  estructura(await api('PATCH', '/api/auth/password', { token: t.carlos, body: { password_actual: 'Mala#2026xyz', password_nueva: 'Molienda#2026x' } }), 400);
  estructura(await api('PATCH', '/api/auth/password', { token: t.carlos, body: { password_actual: 'Tostado#2026xy', password_nueva: 'Tostado#2026xy' } }), 400);
  estructura(await api('PATCH', '/api/auth/password', { token: t.carlos, body: { password_actual: 'Tostado#2026xy', password_nueva: 'Carlos#2026xy' } }), 400);
  const r = await api('PATCH', '/api/auth/password', { token: t.carlos, body: { password_actual: 'Tostado#2026xy', password_nueva: 'Molienda#2026x' } });
  estructura(r, 200);
  // El token anterior deja de valer al cambiar la contraseña; el nuevo sí funciona.
  estructura(await api('GET', '/api/auth/perfil', { token: t.carlos }), 401);
  estructura(await api('GET', '/api/auth/perfil', { token: r.json.data.token }), 200);
  estructura(await api('POST', '/api/auth/login', { body: { correo: 'carlos@correo.com', password: 'Molienda#2026x' } }), 200);
});

test('Logout simulado: requiere token y responde 200 con instrucciones', async () => {
  estructura(await api('POST', '/api/auth/logout'), 401);
  const sesion = (await api('POST', '/api/auth/login', { body: CREDENCIALES.usuario })).json.data.token;
  const r = await api('POST', '/api/auth/logout', { token: sesion });
  estructura(r, 200);
  assert.match(r.json.data.instrucciones, /localStorage/);
  estructura(await api('GET', '/api/auth/perfil', { token: sesion }), 401);
  estructura(await api('GET', '/api/auth/perfil', { token: t.usuario }), 200);
});

test('Login: 5 intentos fallidos bloquean temporalmente la cuenta (429), exista o no', async () => {
  const body = { nombre: 'Rosa Pineda', correo: 'rosa@correo.com', password: 'Grano#Rojo2026' };
  estructura(await api('POST', '/api/auth/registro', { body }), 201);
  for (let i = 0; i < 5; i++) {
    estructura(await api('POST', '/api/auth/login', { body: { correo: body.correo, password: 'Mala#Clave2026' } }), 401);
  }
  estructura(await api('POST', '/api/auth/login', { body: { correo: body.correo, password: body.password } }), 429);
  for (let i = 0; i < 5; i++) await api('POST', '/api/auth/login', { body: { correo: 'fantasma@correo.com', password: 'Mala#Clave2026' } });
  estructura(await api('POST', '/api/auth/login', { body: { correo: 'fantasma@correo.com', password: 'Mala#Clave2026' } }), 429);
});

test('Token con otra firma, sin emisor/audiencia o de usuario inexistente -> 401', async () => {
  const sinEmisor = jwt.sign({ id: 2, sub: '2' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  estructura(await api('GET', '/api/auth/perfil', { token: sinEmisor }), 401);
  const ninguno = jwt.sign({ id: 999 }, process.env.JWT_SECRET, { expiresIn: '1h', issuer: 'cafe-hondureno-api', audience: 'cafe-hondureno-web', subject: '999' });
  estructura(await api('GET', '/api/auth/perfil', { token: ninguno }), 401);
  const ninguno2 = jwt.sign({ id: 2 }, process.env.JWT_SECRET, { algorithm: 'HS512', expiresIn: '1h', issuer: 'cafe-hondureno-api', audience: 'cafe-hondureno-web', subject: '2' });
  estructura(await api('GET', '/api/auth/perfil', { token: ninguno2 }), 401);
});

test('Usuarios: admin lista (200); usuario normal 403; sin token 401', async () => {
  const r = await api('GET', '/api/usuarios', { token: t.admin });
  estructura(r, 200);
  assert.ok(r.json.data.length >= 3);
  assert.ok(r.json.data.every((u) => u.password_hash === undefined));
  estructura(await api('GET', '/api/usuarios', { token: t.usuario }), 403);
  estructura(await api('GET', '/api/usuarios'), 401);
});

test('Usuarios: desactivar a un usuario impide su login (403); admin no puede desactivarse a sí mismo', async () => {
  const carlos = await modelos.Usuario.findOne({ where: { correo: 'carlos@correo.com' } });
  estructura(await api('PATCH', `/api/usuarios/${carlos.id}`, { token: t.admin, body: { activo: false } }), 200);
  estructura(await api('POST', '/api/auth/login', { body: { correo: 'carlos@correo.com', password: 'Molienda#2026x' } }), 403);
  estructura(await api('PATCH', '/api/usuarios/1', { token: t.admin, body: { activo: false } }), 400);
  estructura(await api('PATCH', '/api/usuarios/999', { token: t.admin, body: { activo: true } }), 404);
  estructura(await api('PATCH', `/api/usuarios/${carlos.id}`, { token: t.admin, body: { rol_id: 99 } }), 400);
});

test('Categorías: lectura pública con filtro por tipo', async () => {
  const r = await api('GET', '/api/categorias?tipo=curiosidad');
  estructura(r, 200);
  assert.ok(r.json.data.every((c) => c.tipo === 'curiosidad'));
  estructura(await api('GET', '/api/categorias?tipo=otro'), 400);
  estructura(await api('GET', '/api/categorias/1'), 200);
  estructura(await api('GET', '/api/categorias/999'), 404);
  estructura(await api('GET', '/api/categorias/abc'), 400);
});

test('Categorías: CRUD de admin (201, 409 duplicada, 200, 200) y 403 para usuario', async () => {
  estructura(await api('POST', '/api/categorias', { token: t.usuario, body: { nombre: 'Cultura', tipo: 'curiosidad' } }), 403);
  const c = await api('POST', '/api/categorias', { token: t.admin, body: { nombre: 'Cultura', tipo: 'curiosidad' } });
  estructura(c, 201);
  estructura(await api('POST', '/api/categorias', { token: t.admin, body: { nombre: 'Cultura', tipo: 'curiosidad' } }), 409);
  estructura(await api('POST', '/api/categorias', { token: t.admin, body: { nombre: 'X', tipo: 'otro' } }), 400);
  estructura(await api('PUT', `/api/categorias/${c.json.data.id}`, { token: t.admin, body: { nombre: 'Cultura cafetalera', tipo: 'curiosidad' } }), 200);
  estructura(await api('DELETE', `/api/categorias/${c.json.data.id}`, { token: t.admin }), 200);
});

test('Regiones: lectura pública y CRUD de admin', async () => {
  estructura(await api('GET', '/api/regiones'), 200);
  const r = await api('POST', '/api/regiones', { token: t.admin, body: { nombre: 'Agalta', departamentos: 'Olancho', perfil_taza: 'Notas tropicales' } });
  estructura(r, 201);
  estructura(await api('POST', '/api/regiones', { token: t.admin, body: { nombre: 'Agalta' } }), 409);
  const put = await api('PUT', `/api/regiones/${r.json.data.id}`, { token: t.admin, body: { nombre: 'Agalta Tropical' } });
  estructura(put, 200);
  assert.equal(put.json.data.departamentos, null, 'PUT debe dejar en NULL los opcionales que no se envían');
  estructura(await api('DELETE', `/api/regiones/${r.json.data.id}`, { token: t.admin }), 200);
  estructura(await api('DELETE', '/api/regiones/999', { token: t.admin }), 404);
});

test('Curiosidades: CRUD completo con el token del login (compatibilidad con la Parte CRUD)', async () => {
  estructura(await api('POST', '/api/curiosidades', { body: { titulo: 'x', descripcion: 'y', categoria_id: 1 } }), 401);
  const c = await api('POST', '/api/curiosidades', {
    token: t.usuario,
    body: { titulo: 'Marcala hizo historia', descripcion: 'Primera denominación de origen de café en Centroamérica.', categoria_id: 1, region_id: 2 },
  });
  estructura(c, 201);
  assert.equal(c.json.data.creado_por, 2);
  assert.equal(c.json.data.autor.nombre, 'María López');
  const id = c.json.data.id;

  const lista = await api('GET', '/api/curiosidades?q=Marcala');
  estructura(lista, 200);
  assert.ok(lista.json.data.some((x) => x.id === id));
  estructura(await api('GET', `/api/curiosidades/${id}`), 200);
  estructura(await api('PATCH', `/api/curiosidades/${id}`, { token: t.usuario, body: { titulo: 'Marcala, D.O.' } }), 200);
  estructura(await api('PUT', `/api/curiosidades/${id}`, { token: t.usuario, body: { titulo: 'Marcala', descripcion: 'Texto nuevo', categoria_id: 2 } }), 200);
  estructura(await api('POST', '/api/curiosidades', { token: t.usuario, body: { titulo: 'x', descripcion: 'y', categoria_id: 3 } }), 400);
  const otro = (await api('POST', '/api/auth/registro', { body: { nombre: 'Ana', correo: 'ana@correo.com', password: 'Cereza#Roja2026' } })).json.data.token;
  estructura(await api('DELETE', `/api/curiosidades/${id}`, { token: otro }), 403);
  estructura(await api('DELETE', `/api/curiosidades/${id}`, { token: t.admin }), 200);
  estructura(await api('GET', `/api/curiosidades/${id}`), 404);
});

test('Categorías: no se puede borrar una categoría en uso (409)', async () => {
  const c = await api('POST', '/api/curiosidades', { token: t.admin, body: { titulo: 'Dato', descripcion: 'Dato de prueba', categoria_id: 2 } });
  estructura(c, 201);
  estructura(await api('DELETE', '/api/categorias/2', { token: t.admin }), 409);
  estructura(await api('PUT', '/api/categorias/2', { token: t.admin, body: { nombre: 'Economía', tipo: 'galeria' } }), 409);
});

test('Galería: lectura pública y CRUD de admin con validaciones', async () => {
  const foto = { titulo: 'Finca en Marcala', descripcion: 'Cafetal al amanecer', imagen_url: 'imagenes/marcala.jpg', categoria_id: 3, region_id: 2 };
  estructura(await api('POST', '/api/galeria', { token: t.usuario, body: foto }), 403);
  estructura(await api('POST', '/api/galeria', { token: t.admin, body: { ...foto, categoria_id: 1 } }), 400);
  estructura(await api('POST', '/api/galeria', { token: t.admin, body: { ...foto, imagen_url: 'no válida con espacios' } }), 400);
  const r = await api('POST', '/api/galeria', { token: t.admin, body: foto });
  estructura(r, 201);
  assert.equal(r.json.data.subido_por, 1);
  const id = r.json.data.id;
  const lista = await api('GET', '/api/galeria?categoria_id=3');
  estructura(lista, 200);
  assert.equal(lista.json.meta.total, 1);
  const put = await api('PUT', `/api/galeria/${id}`, { token: t.admin, body: { titulo: 'Finca', imagen_url: 'https://ejemplo.com/f.jpg', categoria_id: 3 } });
  estructura(put, 200);
  assert.equal(put.json.data.region_id, null);
  estructura(await api('DELETE', `/api/galeria/${id}`, { token: t.admin }), 200);
  estructura(await api('GET', `/api/galeria/${id}`), 404);
});

test('Contacto: visitante envía (201, usuario_id NULL); con sesión guarda usuario_id', async () => {
  const msg = { nombre: 'Visitante', correo: 'visita@correo.com', asunto: 'informacion', mensaje: '¿Dónde compro café de Marcala?' };
  const a = await api('POST', '/api/contacto', { body: msg });
  estructura(a, 201);
  assert.equal(a.json.data.usuario_id, null);
  assert.equal(a.json.data.leido, false);
  const b = await api('POST', '/api/contacto', { token: t.usuario, body: { ...msg, asunto: 'sugerencia' } });
  estructura(b, 201);
  assert.equal(b.json.data.usuario_id, 2);
  estructura(await api('POST', '/api/contacto', { token: 'falso', body: msg }), 401);
  const malo = await api('POST', '/api/contacto', { body: { nombre: '', correo: 'x', asunto: 'queja', mensaje: '' } });
  estructura(malo, 400);
  assert.equal(malo.json.errors.length, 4);
});

test('Contacto: bandeja de admin, marcar leído y eliminar; usuario normal 403', async () => {
  estructura(await api('GET', '/api/contacto', { token: t.usuario }), 403);
  const r = await api('GET', '/api/contacto?leido=false', { token: t.admin });
  estructura(r, 200);
  assert.equal(r.json.meta.sinLeer, 2);
  const id = r.json.data[0].id;
  const leido = await api('PATCH', `/api/contacto/${id}/leido`, { token: t.admin });
  estructura(leido, 200);
  assert.equal(leido.json.data.leido, true);
  estructura(await api('PATCH', `/api/contacto/${id}/leido`, { token: t.admin, body: { leido: 'si' } }), 400);
  estructura(await api('GET', `/api/contacto/${id}`, { token: t.admin }), 200);
  estructura(await api('DELETE', `/api/contacto/${id}`, { token: t.admin }), 200);
  estructura(await api('GET', `/api/contacto/${id}`, { token: t.admin }), 404);
});

test('Al menos el 50 % de las rutas de la API requieren token', () => {
  const { listarRutas } = require('../scripts/listar-rutas');
  const rutas = listarRutas();
  const privadas = rutas.filter((r) => r.privada).length;
  assert.ok(privadas / rutas.length >= 0.5, `solo ${privadas} de ${rutas.length} rutas son privadas`);
});
