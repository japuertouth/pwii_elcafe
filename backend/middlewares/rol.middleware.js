const AppError = require('../utils/AppError');
const { esAdministrador } = require('../utils/validacion');

function soloAdmin(req, res, next) {
  if (!req.usuario) return next(new AppError('Acceso denegado: falta el token', 401));
  if (!esAdministrador(req.usuario)) {
    return next(new AppError('Solo un administrador puede realizar esta acción', 403));
  }
  return next();
}

module.exports = { soloAdmin };
