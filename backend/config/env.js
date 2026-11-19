/* Carga y valida la configuración del entorno una sola vez.
   En local se lee el archivo .env de la raíz del proyecto; en Vercel las variables
   se definen en Project Settings → Environment Variables. */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
for (const archivo of [path.join(RAIZ, '.env'), path.join(RAIZ, 'backend', '.env')]) {
  if (fs.existsSync(archivo)) require('dotenv').config({ path: archivo });
}

const entorno = process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development');
const esProduccion = entorno === 'production';
const esPrueba = entorno === 'test';

function numero(nombre, porDefecto, { min, max } = {}) {
  const valor = Number(process.env[nombre]);
  let n = Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
  if (min !== undefined) n = Math.max(min, n);
  if (max !== undefined) n = Math.min(max, n);
  return n;
}

const DB_REQUERIDAS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

/** Lista de problemas de configuración que impiden atender la API de forma segura. */
function problemasDeConfiguracion() {
  const problemas = [];
  const faltantes = DB_REQUERIDAS.filter((k) => !process.env[k]);
  if (faltantes.length) problemas.push(`Faltan variables de la base de datos: ${faltantes.join(', ')}`);
  const secreto = process.env.JWT_SECRET || '';
  if (!secreto) problemas.push('Falta JWT_SECRET');
  else if (esProduccion && secreto.length < 32) problemas.push('JWT_SECRET debe tener al menos 32 caracteres en producción');
  return problemas;
}

module.exports = {
  RAIZ,
  entorno,
  esProduccion,
  esPrueba,
  numero,
  problemasDeConfiguracion,
  get jwt() {
    return {
      secreto: process.env.JWT_SECRET,
      expira: process.env.JWT_EXPIRES_IN || '2h',
      emisor: 'cafe-hondureno-api',
      audiencia: 'cafe-hondureno-web',
    };
  },
  get bcryptCosto() {
    // 12 por defecto; nunca menos de 10 fuera de las pruebas automáticas.
    return numero('BCRYPT_COSTO', 12, { min: esPrueba ? 4 : 10, max: 14 });
  },
  get rolAdmin() {
    return numero('ADMIN_ROL_ID', 1);
  },
  get rolUsuario() {
    return numero('USUARIO_ROL_ID', 2);
  },
};
