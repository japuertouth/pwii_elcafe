/* Aplica en la base de Azure los scripts de docs/sql/ (son seguros de repetir). Uso: npm run migrar */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

const CARPETA = path.join(__dirname, '..', '..', 'docs', 'sql');

async function principal() {
  await sequelize.authenticate();
  const archivos = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.sql')).sort();
  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
    await sequelize.query(sql);
    console.log(`  ✔ ${archivo}`);
  }
  console.log('Listo: la base está al día.');
}

principal()
  .catch((error) => {
    console.error('Error:', error.message);
    console.error('Revisa el archivo .env y que tu IP esté permitida en el firewall de Azure SQL.');
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
