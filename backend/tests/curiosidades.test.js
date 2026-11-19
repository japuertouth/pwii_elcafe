const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const SECRETO = 'secreto_solo_para_pruebas';
process.env.JWT_SECRET = SECRETO;
process.env.ADMIN_ROL_ID = '1';
// La API responde 503 si falta la configuración de la base; aquí los modelos son simulados.
for (const k of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) process.env[k] = process.env[k] || 'prueba';

let categorias;
let regiones;
let filas;
let siguienteId;
let forzarFallo = false;

class Fila {
  constructor(datos) {
    Object.assign(this, datos);
  }
  toJSON() {
    const campos = ['id', 'titulo', 'descripcion', 'categoria_id', 'region_id', 'creado_por', 'creado_en', 'actualizado_en'];
    const salida = Object.fromEntries(campos.map((c) => [c, this[c]]));
    const cat = categorias.find((c) => c.id === this.categoria_id);
    const reg = regiones.find((r) => r.id === this.region_id);
    salida.categoria = cat ? { id: cat.id, nombre: cat.nombre, tipo: cat.tipo } : null;
    salida.region = reg ? { id: reg.id, nombre: reg.nombre } : null;
    salida.autor = this.creado_por ? { id: this.creado_por, nombre: `Usuario ${this.creado_por}` } : null;
    return salida;
  }
}

const HASH_PRUEBA = '$2b$04$abcdefghijklmnopqrstuuW8n1v8z3pQm5o7xYgZf0c1d2e3f4g5h6i';
const modelosFalsos = {
  Usuario: {
    async findByPk(id) {
      if (![1, 10, 20, 99].includes(id)) return null;
      return { id, correo: `usuario${id}@correo.com`, rol_id: id === 1 ? 1 : 2, activo: true, password_hash: HASH_PRUEBA };
    },
  },
  Categoria: { findByPk: async (id) => categorias.find((c) => c.id === id) || null },
  Region: { findByPk: async (id) => regiones.find((r) => r.id === id) || null },
  Curiosidad: {
    async listar({ categoriaId, regionId, categoriaNombre, texto, page, limit }) {
      if (forzarFallo) throw new Error('fallo simulado de base de datos');
      let resultado = [...filas].sort((a, b) => b.id - a.id);
      if (categoriaId) resultado = resultado.filter((f) => f.categoria_id === categoriaId);
      if (regionId) resultado = resultado.filter((f) => f.region_id === regionId);
      if (categoriaNombre) {
        resultado = resultado.filter((f) => categorias.find((c) => c.id === f.categoria_id).nombre === categoriaNombre);
      }
      if (texto) {
        const t = texto.toLowerCase();
        resultado = resultado.filter((f) => f.titulo.toLowerCase().includes(t) || f.descripcion.toLowerCase().includes(t));
      }
      return { count: resultado.length, rows: resultado.slice((page - 1) * limit, page * limit) };
    },
    async obtenerPorId(id) {
      return filas.find((f) => f.id === id) || null;
    },
    async obtenerAleatoria({ excluirId, categoriaId } = {}) {
      const candidatas = filas.filter((f) => f.id !== excluirId && (!categoriaId || f.categoria_id === categoriaId));
      return candidatas.length ? candidatas[Math.floor(Math.random() * candidatas.length)] : null;
    },
    async crearYObtener(datos) {
      const fila = new Fila({ id: siguienteId++, region_id: null, ...datos, creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString() });
      filas.push(fila);
      return fila;
    },
    async actualizarYObtener(fila, datos) {
      Object.assign(fila, datos, { actualizado_en: new Date().toISOString() });
      return fila;
    },
    async eliminar(fila) {
      filas = filas.filter((f) => f.id !== fila.id);
    },
  },
};

const rutaModelos = require.resolve('../models');
require.cache[rutaModelos] = { id: rutaModelos, filename: rutaModelos, loaded: true, exports: modelosFalsos };

const app = require('../src/app');

function reiniciarDatos() {
  forzarFallo = false;
  categorias = [
    { id: 1, nombre: 'Economía', tipo: 'curiosidad' },
    { id: 2, nombre: 'Cultivo', tipo: 'curiosidad' },
    { id: 9, nombre: 'Fincas', tipo: 'galeria' },
  ];
  regiones = [
    { id: 1, nombre: 'Copán' },
    { id: 2, nombre: 'Marcala' },
  ];
  filas = [
    new Fila({ id: 1, titulo: 'Gigante de Centroamérica', descripcion: 'Honduras es el mayor productor de café de la región.', categoria_id: 1, region_id: null, creado_por: 10, creado_en: '2026-01-01T00:00:00.000Z', actualizado_en: '2026-01-01T00:00:00.000Z' }),
    new Fila({ id: 2, titulo: 'Marcala hizo historia', descripcion: 'Primera denominación de origen para café de Centroamérica.', categoria_id: 2, region_id: 2, creado_por: 20, creado_en: '2026-01-02T00:00:00.000Z', actualizado_en: '2026-01-02T00:00:00.000Z' }),
    new Fila({ id: 3, titulo: 'Un café sin autor', descripcion: 'Registro cuyo usuario fue eliminado (creado_por = NULL).', categoria_id: 1, region_id: null, creado_por: null, creado_en: '2026-01-03T00:00:00.000Z', actualizado_en: '2026-01-03T00:00:00.000Z' }),
  ];
  siguienteId = 4;
}

let servidor;
let base;

test.before(async () => {
  servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
test.after(() => servidor.close());
test.beforeEach(reiniciarDatos);

const { huellaPassword } = require('../utils/seguridad');
const tokenDe = (payload, opciones = {}) =>
  jwt.sign({ ver: huellaPassword(HASH_PRUEBA), ...payload }, SECRETO, {
    expiresIn: '1h',
    issuer: 'cafe-hondureno-api',
    audience: 'cafe-hondureno-web',
    ...(payload.id ? { subject: String(payload.id) } : {}),
    ...opciones,
  });
const tokenUsuario10 = () => tokenDe({ id: 10, rol_id: 2 });
const tokenOtroUsuario = () => tokenDe({ id: 99, rol_id: 2 });
const tokenAdmin = () => tokenDe({ id: 1, rol_id: 1 });

async function api(metodo, ruta, { token, body, crudo } = {}) {
  const headers = {};
  if (body !== undefined || crudo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const respuesta = await fetch(base + ruta, {
    method: metodo,
    headers,
    body: crudo !== undefined ? crudo : body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: respuesta.status, headers: respuesta.headers, json: await respuesta.json() };
}

const nuevaValida = (extra = {}) => ({ titulo: 'El café nace en una cereza', descripcion: 'Cada cereza guarda dos semillas.', categoria_id: 1, ...extra });

test('GET /api/curiosidades -> 200 con lista, meta y estructura success', async () => {
  const r = await api('GET', '/api/curiosidades');
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'success');
  assert.equal(r.json.data.length, 3);
  assert.deepEqual(r.json.meta, { total: 3, page: 1, limit: 10, totalPages: 1 });
  assert.equal(r.json.data[0].categoria.nombre, 'Economía');
  assert.ok('autor' in r.json.data[0]);
  assert.ok(!('password_hash' in (r.json.data[1].autor || {})));
});

test('GET /api/curiosidades aplica filtros y paginación', async () => {
  assert.equal((await api('GET', '/api/curiosidades?categoria_id=2')).json.data.length, 1);
  assert.equal((await api('GET', '/api/curiosidades?categoria=Economía')).json.data.length, 2);
  assert.equal((await api('GET', '/api/curiosidades?region_id=2')).json.data[0].id, 2);
  assert.equal((await api('GET', '/api/curiosidades?q=marcala')).json.data.length, 1);

  const pagina = await api('GET', '/api/curiosidades?page=2&limit=2');
  assert.equal(pagina.json.data.length, 1);
  assert.deepEqual(pagina.json.meta, { total: 3, page: 2, limit: 2, totalPages: 2 });
});

test('GET /api/curiosidades con parámetros inválidos -> 400', async () => {
  for (const consulta of ['page=0', 'page=abc', 'limit=-3', 'categoria_id=xyz', 'region_id=1.5']) {
    const r = await api('GET', `/api/curiosidades?${consulta}`);
    assert.equal(r.status, 400, consulta);
    assert.equal(r.json.status, 'error');
  }
});

test('GET /api/curiosidades limita el tamaño de página a 50', async () => {
  const r = await api('GET', '/api/curiosidades?limit=500');
  assert.equal(r.json.meta.limit, 50);
});

test('GET /api/curiosidades/aleatoria -> 200 y respeta "excluir"', async () => {
  const r = await api('GET', '/api/curiosidades/aleatoria');
  assert.equal(r.status, 200);
  assert.ok(r.json.data.id);

  for (let i = 0; i < 15; i++) {
    const otra = await api('GET', '/api/curiosidades/aleatoria?excluir=1');
    assert.notEqual(otra.json.data.id, 1);
  }
});

test('GET /api/curiosidades/aleatoria -> 404 si no hay candidatas, 400 si excluir es inválido', async () => {
  const sinResultados = await api('GET', '/api/curiosidades/aleatoria?categoria_id=2&excluir=2');
  assert.equal(sinResultados.status, 404);
  assert.equal(sinResultados.json.status, 'error');
  assert.equal((await api('GET', '/api/curiosidades/aleatoria?excluir=abc')).status, 400);
});

test('GET /api/curiosidades/:id -> 200, 404 y 400', async () => {
  const ok = await api('GET', '/api/curiosidades/2');
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.titulo, 'Marcala hizo historia');
  assert.equal(ok.json.data.region.nombre, 'Marcala');

  const noExiste = await api('GET', '/api/curiosidades/9999');
  assert.equal(noExiste.status, 404);
  assert.equal(noExiste.json.status, 'error');

  assert.equal((await api('GET', '/api/curiosidades/abc')).status, 400);
  assert.equal((await api('GET', '/api/curiosidades/-1')).status, 400);
  assert.equal((await api('GET', '/api/curiosidades/99999999999')).status, 400);
});

test('Rutas privadas sin token válido -> 401', async () => {
  const privadas = [
    ['POST', '/api/curiosidades', nuevaValida()],
    ['PUT', '/api/curiosidades/1', nuevaValida()],
    ['PATCH', '/api/curiosidades/1', { titulo: 'x' }],
    ['DELETE', '/api/curiosidades/1', undefined],
  ];
  const tokensMalos = {
    'sin token': undefined,
    'token basura': 'esto.no.es.un.jwt',
    'firmado con otra clave': jwt.sign({ id: 10 }, 'otra_clave', { expiresIn: '1h' }),
    'expirado': tokenDe({ id: 10 }, { expiresIn: -60 }),
    'sin id de usuario': tokenDe({ correo: 'a@b.com' }),
  };

  for (const [metodo, ruta, body] of privadas) {
    for (const [descripcion, token] of Object.entries(tokensMalos)) {
      const r = await api(metodo, ruta, { token, body });
      assert.equal(r.status, 401, `${metodo} ${ruta} (${descripcion})`);
      assert.equal(r.json.status, 'error');
    }
  }
  assert.equal(filas.length, 3, 'ninguna petición rechazada debe modificar datos');
});

test('Cabecera Authorization sin el esquema "Bearer" -> 401', async () => {
  const r = await fetch(`${base}/api/curiosidades/1`, { method: 'DELETE', headers: { Authorization: tokenUsuario10() } });
  assert.equal(r.status, 401);
});

test('POST /api/curiosidades -> 201, guarda al autor desde el token y devuelve Location', async () => {
  const r = await api('POST', '/api/curiosidades', {
    token: tokenUsuario10(),
    body: nuevaValida({ region_id: 1, creado_por: 555, id: 777 }),
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.status, 'success');
  assert.equal(r.json.data.id, 4);
  assert.equal(r.json.data.creado_por, 10);
  assert.equal(r.json.data.region.nombre, 'Copán');
  assert.equal(r.headers.get('location'), '/api/curiosidades/4');
  assert.equal(filas.length, 4);
});

test('POST recorta espacios y acepta ids numéricos escritos como texto', async () => {
  const r = await api('POST', '/api/curiosidades', {
    token: tokenUsuario10(),
    body: { titulo: '  Con espacios  ', descripcion: ' texto ', categoria_id: '2', region_id: '1' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.titulo, 'Con espacios');
  assert.equal(r.json.data.categoria_id, 2);
});

test('POST con datos inválidos -> 400 con detalle por campo', async () => {
  const casos = {
    'cuerpo vacío': { body: {}, campos: ['titulo', 'descripcion', 'categoria_id'] },
    'título en blanco': { body: nuevaValida({ titulo: '   ' }), campos: ['titulo'] },
    'título demasiado largo': { body: nuevaValida({ titulo: 'a'.repeat(151) }), campos: ['titulo'] },
    'descripción demasiado larga': { body: nuevaValida({ descripcion: 'a'.repeat(1001) }), campos: ['descripcion'] },
    'título no es texto': { body: nuevaValida({ titulo: 123 }), campos: ['titulo'] },
    'categoría inválida': { body: nuevaValida({ categoria_id: 'abc' }), campos: ['categoria_id'] },
    'categoría inexistente': { body: nuevaValida({ categoria_id: 500 }), campos: ['categoria_id'] },
    'categoría de tipo galería': { body: nuevaValida({ categoria_id: 9 }), campos: ['categoria_id'] },
    'región inexistente': { body: nuevaValida({ region_id: 500 }), campos: ['region_id'] },
    'región inválida': { body: nuevaValida({ region_id: 'x' }), campos: ['region_id'] },
  };

  for (const [nombre, { body, campos }] of Object.entries(casos)) {
    const r = await api('POST', '/api/curiosidades', { token: tokenUsuario10(), body });
    assert.equal(r.status, 400, nombre);
    assert.equal(r.json.status, 'error', nombre);
    assert.deepEqual(r.json.errors.map((e) => e.campo).sort(), [...campos].sort(), nombre);
  }
  assert.equal(filas.length, 3);
});

test('POST con JSON mal formado o sin cuerpo -> 400', async () => {
  const malFormado = await api('POST', '/api/curiosidades', { token: tokenUsuario10(), crudo: '{"titulo": ' });
  assert.equal(malFormado.status, 400);
  assert.equal(malFormado.json.status, 'error');

  const sinCuerpo = await api('POST', '/api/curiosidades', { token: tokenUsuario10() });
  assert.equal(sinCuerpo.status, 400);
});

test('PUT /api/curiosidades/:id -> 200 reemplaza todo (region_id omitido queda en null)', async () => {
  const r = await api('PUT', '/api/curiosidades/2', {
    token: tokenDe({ id: 20, rol_id: 2 }),
    body: { titulo: 'Título nuevo', descripcion: 'Descripción nueva', categoria_id: 1 },
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'success');
  assert.equal(r.json.data.titulo, 'Título nuevo');
  assert.equal(r.json.data.categoria_id, 1);
  assert.equal(r.json.data.region_id, null);
  assert.equal(r.json.data.creado_por, 20);
});

test('PUT sin campos obligatorios -> 400; id inexistente -> 404; id inválido -> 400', async () => {
  const incompleto = await api('PUT', '/api/curiosidades/1', { token: tokenUsuario10(), body: { titulo: 'solo título' } });
  assert.equal(incompleto.status, 400);

  assert.equal((await api('PUT', '/api/curiosidades/9999', { token: tokenUsuario10(), body: nuevaValida() })).status, 404);
  assert.equal((await api('PUT', '/api/curiosidades/abc', { token: tokenUsuario10(), body: nuevaValida() })).status, 400);
});

test('PUT: un usuario que no es el autor recibe 403; el administrador sí puede', async () => {
  const prohibido = await api('PUT', '/api/curiosidades/1', { token: tokenOtroUsuario(), body: nuevaValida() });
  assert.equal(prohibido.status, 403);
  assert.equal(filas.find((f) => f.id === 1).titulo, 'Gigante de Centroamérica');

  const admin = await api('PUT', '/api/curiosidades/1', { token: tokenAdmin(), body: nuevaValida() });
  assert.equal(admin.status, 200);

  assert.equal((await api('PUT', '/api/curiosidades/3', { token: tokenUsuario10(), body: nuevaValida() })).status, 403);
  assert.equal((await api('PUT', '/api/curiosidades/3', { token: tokenAdmin(), body: nuevaValida() })).status, 200);
});

test('PATCH /api/curiosidades/:id -> 200 y solo cambia los campos enviados', async () => {
  const antes = filas.find((f) => f.id === 1).descripcion;
  const r = await api('PATCH', '/api/curiosidades/1', { token: tokenUsuario10(), body: { titulo: 'Solo cambia el título' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.titulo, 'Solo cambia el título');
  assert.equal(r.json.data.descripcion, antes);

  const quitaRegion = await api('PATCH', '/api/curiosidades/2', { token: tokenDe({ id: 20 }), body: { region_id: null } });
  assert.equal(quitaRegion.status, 200);
  assert.equal(quitaRegion.json.data.region, null);
});

test('PATCH con cuerpo vacío o datos inválidos -> 400; ajeno -> 403; inexistente -> 404', async () => {
  assert.equal((await api('PATCH', '/api/curiosidades/1', { token: tokenUsuario10(), body: {} })).status, 400);
  assert.equal((await api('PATCH', '/api/curiosidades/1', { token: tokenUsuario10(), body: { titulo: '' } })).status, 400);
  assert.equal((await api('PATCH', '/api/curiosidades/1', { token: tokenUsuario10(), body: { categoria_id: 9 } })).status, 400);
  assert.equal((await api('PATCH', '/api/curiosidades/1', { token: tokenOtroUsuario(), body: { titulo: 'x' } })).status, 403);
  assert.equal((await api('PATCH', '/api/curiosidades/9999', { token: tokenUsuario10(), body: { titulo: 'x' } })).status, 404);
});

test('DELETE /api/curiosidades/:id -> 200 y luego el GET devuelve 404', async () => {
  const r = await api('DELETE', '/api/curiosidades/1', { token: tokenUsuario10() });
  assert.equal(r.status, 200);
  assert.equal(r.json.status, 'success');
  assert.deepEqual(r.json.data, { id: 1 });
  assert.equal((await api('GET', '/api/curiosidades/1')).status, 404);
  assert.equal(filas.length, 2);
});

test('DELETE: ajeno -> 403, inexistente -> 404, id inválido -> 400, administrador -> 200', async () => {
  assert.equal((await api('DELETE', '/api/curiosidades/1', { token: tokenOtroUsuario() })).status, 403);
  assert.equal(filas.length, 3);
  assert.equal((await api('DELETE', '/api/curiosidades/9999', { token: tokenUsuario10() })).status, 404);
  assert.equal((await api('DELETE', '/api/curiosidades/abc', { token: tokenUsuario10() })).status, 400);
  assert.equal((await api('DELETE', '/api/curiosidades/2', { token: tokenAdmin() })).status, 200);
});

test('Ruta inexistente -> 404 en formato JSON', async () => {
  const r = await api('GET', '/api/no-existe');
  assert.equal(r.status, 404);
  assert.equal(r.json.status, 'error');
  assert.ok(r.json.message);
});

test('Un fallo inesperado -> 500 sin filtrar detalles internos', async () => {
  forzarFallo = true;
  const silenciar = console.error;
  console.error = () => {};
  try {
    const r = await api('GET', '/api/curiosidades');
    assert.equal(r.status, 500);
    assert.equal(r.json.status, 'error');
    assert.equal(r.json.message, 'Error interno del servidor');
    assert.ok(!JSON.stringify(r.json).includes('fallo simulado'));
  } finally {
    console.error = silenciar;
  }
});
