function enviarExito(res, { statusCode = 200, message, data = null, meta } = {}) {
  const cuerpo = { status: 'success' };
  if (message) cuerpo.message = message;
  cuerpo.data = data;
  if (meta) cuerpo.meta = meta;
  return res.status(statusCode).json(cuerpo);
}

function enviarError(res, statusCode, message, errores) {
  const cuerpo = { status: 'error', message };
  if (Array.isArray(errores) && errores.length > 0) cuerpo.errors = errores;
  return res.status(statusCode).json(cuerpo);
}

module.exports = { enviarExito, enviarError };
