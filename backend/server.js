/* Servidor local: atiende la API y la fan page en http://localhost:4000.
   En Vercel no se usa este archivo: la API corre como función (api/index.js)
   y la carpeta public/ se sirve desde la CDN. */
const config = require('./config/env');
const app = require('./src/app.js');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 4000;

async function iniciar() {
  const problemas = config.problemasDeConfiguracion();
  if (problemas.length > 0) {
    console.error(`Configuración incompleta: ${problemas.join('. ')}.`);
    console.error('Copia .env.example como .env en la raíz del proyecto y complétalo.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error.message);
    console.error('Revisa el archivo .env y que tu IP esté permitida en el firewall de Azure SQL.');
    process.exit(1);
  }

  const servidor = app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
    console.log(`Fan page: http://localhost:${PORT}/`);
    console.log(`API:      http://localhost:${PORT}/api/salud`);
  });

  const cerrar = () => servidor.close(() => sequelize.close().finally(() => process.exit(0)));
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
}

iniciar();
