const { QueryTypes } = require('sequelize');
const modelos = require('../models');

const { sequelize } = modelos;
const NOMBRES = ['Rol', 'Usuario', 'Categoria', 'Region', 'Curiosidad', 'Galeria', 'MensajeContacto'];
let problemas = 0;

const ok = (texto) => console.log(`  ✔ ${texto}`);
const mal = (texto) => { problemas += 1; console.log(`  ✖ ${texto}`); };

async function columnasReales() {
  const filas = await sequelize.query(
    `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, IS_NULLABLE AS nulo, DATA_TYPE AS tipo
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'`,
    { type: QueryTypes.SELECT }
  );
  const mapa = {};
  for (const f of filas) (mapa[f.tabla.toLowerCase()] ||= {})[f.columna.toLowerCase()] = f;
  return mapa;
}

async function principal() {
  console.log('\n1) Conexión');
  await sequelize.authenticate();
  ok(`Conectado a ${process.env.DB_NAME} en ${process.env.DB_HOST}`);

  console.log('\n2) Tablas y columnas (modelos vs. base real)');
  const reales = await columnasReales();
  for (const nombre of NOMBRES) {
    const modelo = modelos[nombre];
    const tabla = modelo.getTableName().toString().toLowerCase();
    const columnas = reales[tabla];
    if (!columnas) { mal(`Falta la tabla "${tabla}"`); continue; }
    const faltantes = Object.values(modelo.rawAttributes).map((a) => a.field).filter((c) => !columnas[c.toLowerCase()]);
    if (faltantes.length) mal(`${tabla}: no existen las columnas ${faltantes.join(', ')}`);
    else ok(`${tabla}: ${Object.keys(modelo.rawAttributes).length} columnas del modelo encontradas`);
  }

  console.log('\n3) Roles');
  const roles = await sequelize.query('SELECT id, nombre FROM roles ORDER BY id', { type: QueryTypes.SELECT });
  roles.forEach((r) => console.log(`     id ${r.id} = ${r.nombre}`));
  const admin = Number(process.env.ADMIN_ROL_ID || 1);
  const usuario = Number(process.env.USUARIO_ROL_ID || 2);
  roles.some((r) => r.id === admin) ? ok(`ADMIN_ROL_ID=${admin} existe`) : mal(`ADMIN_ROL_ID=${admin} no existe en roles`);
  roles.some((r) => r.id === usuario) ? ok(`USUARIO_ROL_ID=${usuario} existe`) : mal(`USUARIO_ROL_ID=${usuario} no existe en roles`);

  console.log('\n4) Datos de apoyo');
  const conteo = async (sql) => (await sequelize.query(sql, { type: QueryTypes.SELECT }))[0].total;
  const catCur = await conteo("SELECT COUNT(*) AS total FROM categorias WHERE tipo = 'curiosidad'");
  const catGal = await conteo("SELECT COUNT(*) AS total FROM categorias WHERE tipo = 'galeria'");
  const admins = (await sequelize.query('SELECT COUNT(*) AS total FROM usuarios WHERE rol_id = :admin AND activo = 1', { type: QueryTypes.SELECT, replacements: { admin } }))[0].total;
  catCur > 0 ? ok(`${catCur} categoría(s) de tipo curiosidad`) : mal('No hay categorías de tipo "curiosidad" (créalas antes de probar el CRUD)');
  catGal > 0 ? ok(`${catGal} categoría(s) de tipo galeria`) : console.log('  · No hay categorías de tipo "galeria" (solo necesarias para la galería)');
  admins > 0 ? ok(`${admins} administrador(es) activo(s)`) : mal('No hay ningún usuario administrador activo (ver README, sección "Primer administrador")');
  for (const tabla of ['usuarios', 'regiones', 'curiosidades', 'galeria', 'mensajes_contacto']) {
    console.log(`     ${tabla}: ${await conteo(`SELECT COUNT(*) AS total FROM ${tabla}`)} registro(s)`);
  }

  console.log(problemas ? `\nResultado: ${problemas} problema(s) encontrado(s).` : '\nResultado: todo correcto. La API es compatible con la base de Azure.');
}

principal()
  .catch((error) => {
    problemas += 1;
    console.error('\n✖ Error:', error.message);
    console.error('  Revisa el archivo .env y que tu IP esté permitida en el firewall de Azure SQL.');
  })
  .finally(async () => {
    await sequelize.close();
    process.exit(problemas ? 1 : 0);
  });
