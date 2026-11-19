const { verificarToken } = require('./auth.middleware');

function autenticacionOpcional(req, res, next) {
  if (!req.headers.authorization) return next();
  return verificarToken(req, res, next);
}

module.exports = { autenticacionOpcional };
