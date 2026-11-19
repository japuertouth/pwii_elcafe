const AppError = require('../utils/AppError');
const seguridad = require('../utils/seguridad');

/**
 * Verifica el JWT (firma, algoritmo, emisor, audiencia y expiración) y además
 * comprueba en la base de datos que el usuario siga existiendo, esté activo y no
 * haya cambiado su contraseña desde que se emitió el token. El rol se toma de la
 * base de datos, no del token, para que un cambio de rol se aplique al instante.
 */
async function verificarToken(req, res, next) {
  try {
    const encabezado = req.headers.authorization || '';
    const [esquema, token, ...resto] = encabezado.split(' ');
    if (esquema !== 'Bearer' || !token || resto.length > 0 || token.length > 2048) {
      throw new AppError('Acceso denegado: falta el token. Envía Authorization: Bearer <token>', 401);
    }

    let payload;
    try {
      payload = seguridad.verificarFirma(token);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(err.name === 'TokenExpiredError' ? 'El token ha expirado, inicia sesión de nuevo' : 'Token inválido', 401);
    }

    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0 || String(id) !== payload.sub) {
      throw new AppError('Token inválido: no identifica a ningún usuario', 401);
    }
    if (payload.jti && seguridad.estaRevocado(payload.jti)) {
      throw new AppError('La sesión fue cerrada, inicia sesión de nuevo', 401);
    }

    const { Usuario, Rol } = require('../models');
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id', 'correo', 'rol_id', 'activo', 'password_hash'],
      include: Rol ? [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] : undefined,
    });
    if (!usuario) throw new AppError('La sesión ya no es válida, inicia sesión de nuevo', 401);
    if (payload.ver !== seguridad.huellaPassword(usuario.password_hash)) {
      throw new AppError('La sesión expiró porque la contraseña cambió, inicia sesión de nuevo', 401);
    }
    if (!usuario.activo) throw new AppError('La cuenta está desactivada. Contacta al administrador', 403);

    req.tokenPayload = payload;
    req.usuario = {
      id: usuario.id,
      correo: usuario.correo,
      rol_id: Number(usuario.rol_id),
      rol: usuario.rol ? usuario.rol.nombre : undefined,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { verificarToken };
