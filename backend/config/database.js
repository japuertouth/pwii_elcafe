const { Sequelize } = require('sequelize');
const { problemasDeConfiguracion } = require('./env');

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

const problemas = problemasDeConfiguracion().filter((p) => p.startsWith('Faltan variables de la base'));
if (problemas.length > 0) {
  // No se detiene el proceso: la API responde 503 y el sitio estático sigue funcionando.
  console.error(`[config] ${problemas.join('. ')}. Revisa el archivo .env (hay un ejemplo en .env.example).`);
}

const sequelize = new Sequelize(DB_NAME || 'sin-configurar', DB_USER || 'sin-configurar', DB_PASSWORD || 'sin-configurar', {
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 1433,
  dialect: 'mssql',
  // Se pasa el driver de forma explícita para que Vercel lo incluya en la función.
  dialectModule: require('tedious'),
  logging: false,
  dialectOptions: {
    options: {
      encrypt: true,
      trustServerCertificate: false,
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
  },
  // Pool pequeño: en Vercel cada instancia de la función abre su propio pool.
  pool: { max: 3, min: 0, acquire: 30000, idle: 10000, evict: 10000 },
  define: {
    freezeTableName: true,
    timestamps: false,
  },
});

module.exports = sequelize;
