const AppError = require('../utils/AppError');
const { enviarError } = require('../utils/response');

function rutaNoEncontrada(req, res) {
  // Solo la ruta (sin parámetros de consulta) y recortada, para no reflejar datos arbitrarios.
  const ruta = String(req.path || '').slice(0, 120);
  return enviarError(res, 404, `Ruta no encontrada: ${req.method} ${ruta}`);
}

const ERRORES_DE_CONEXION = new Set([
  'SequelizeConnectionError',
  'SequelizeConnectionRefusedError',
  'SequelizeHostNotFoundError',
  'SequelizeHostNotReachableError',
  'SequelizeAccessDeniedError',
  'SequelizeConnectionTimedOutError',
  'SequelizeConnectionAcquireTimeoutError',
]);

function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return enviarError(res, err.statusCode, err.message, err.errores);
  }

  if (err.type === 'entity.parse.failed') return enviarError(res, 400, 'El JSON enviado no es válido');
  if (err.type === 'entity.too.large') return enviarError(res, 413, 'El cuerpo de la petición es demasiado grande');

  if (err.status >= 400 && err.status < 500 && err.expose) {
    return enviarError(res, err.status, err.message);
  }

  if (ERRORES_DE_CONEXION.has(err.name)) {
    console.error('[BD]', err.name, err.message);
    return enviarError(res, 503, 'No hay conexión con la base de datos. Intenta de nuevo en unos minutos.');
  }

  switch (err.name) {
    case 'SequelizeValidationError':
      return enviarError(
        res,
        400,
        'Datos inválidos',
        (err.errors || []).map((e) => ({ campo: e.path, mensaje: e.message }))
      );
    case 'SequelizeUniqueConstraintError':
      return enviarError(res, 409, 'Ya existe un registro con esos datos');
    case 'SequelizeForeignKeyConstraintError':
      return enviarError(res, 400, 'Referencia inválida: la categoría, región o usuario indicado no existe');
    default:
      break;
  }

  // El detalle solo queda en los registros del servidor; el cliente recibe un mensaje genérico.
  console.error('[ERROR 500]', req.method, req.path, err);
  return enviarError(res, 500, 'Error interno del servidor');
}

module.exports = { rutaNoEncontrada, manejarErrores };
