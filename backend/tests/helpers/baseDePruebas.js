const path = require('path');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET_PRUEBAS || 'secreto_solo_para_pruebas_automaticas';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_ROL_ID = '1';
process.env.USUARIO_ROL_ID = '2';
process.env.BCRYPT_COSTO = '4';
for (const k of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) process.env[k] = process.env[k] || 'prueba';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: { freezeTableName: true, timestamps: false },
});

const rutaDb = require.resolve(path.join(__dirname, '..', '..', 'config', 'database'));
require.cache[rutaDb] = { id: rutaDb, filename: rutaDb, loaded: true, exports: sequelize };

const modelos = require('../../models');

const CREDENCIALES = {
  admin: { correo: 'admin@cafehondureno.hn', password: 'Admin12345' },
  usuario: { correo: 'maria@cafehondureno.hn', password: 'Maria12345' },
};

async function prepararBase() {
  await sequelize.sync({ force: true });
  require('../../utils/seguridad')._reiniciar();
  const { Rol, Usuario, Categoria, Region } = modelos;
  await Rol.bulkCreate([{ id: 1, nombre: 'admin' }, { id: 2, nombre: 'usuario' }]);
  await Usuario.bulkCreate([
    { id: 1, nombre: 'Administrador', correo: CREDENCIALES.admin.correo, password_hash: await bcrypt.hash(CREDENCIALES.admin.password, 4), rol_id: 1 },
    { id: 2, nombre: 'María López', correo: CREDENCIALES.usuario.correo, password_hash: await bcrypt.hash(CREDENCIALES.usuario.password, 4), rol_id: 2 },
  ]);
  await Categoria.bulkCreate([
    { id: 1, nombre: 'Historia', tipo: 'curiosidad' },
    { id: 2, nombre: 'Economía', tipo: 'curiosidad' },
    { id: 3, nombre: 'Fincas', tipo: 'galeria' },
  ]);
  await Region.bulkCreate([
    { id: 1, nombre: 'Copán', departamentos: 'Copán, Ocotepeque', altitud: '1,000 - 1,500 msnm', perfil_taza: 'Chocolate y caramelo' },
    { id: 2, nombre: 'Montecillos', departamentos: 'La Paz, Comayagua', altitud: '1,200 - 1,600 msnm', perfil_taza: 'Cítrico y floral' },
  ]);
}

async function levantarServidor() {
  const app = require('../../src/app');
  const servidor = app.listen(0);
  await new Promise((resolve) => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  async function api(metodo, ruta, { token, body, crudo } = {}) {
    const headers = {};
    if (body !== undefined || crudo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const respuesta = await fetch(base + ruta, {
      method: metodo,
      headers,
      body: crudo !== undefined ? crudo : body !== undefined ? JSON.stringify(body) : undefined,
    });
    const texto = await respuesta.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { json = null; }
    return { status: respuesta.status, headers: respuesta.headers, json };
  }

  return { app, servidor, base, api };
}

module.exports = { sequelize, modelos, prepararBase, levantarServidor, CREDENCIALES };
