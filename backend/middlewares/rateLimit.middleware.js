/* Límites de peticiones por IP.
   Nota: en Vercel cada instancia de la función guarda su propio contador en memoria.
   Para un límite global entre instancias se puede usar un store compartido
   (por ejemplo Redis/Upstash con rate-limit-redis); ver README. */
const rateLimit = require('express-rate-limit');
const { enviarError } = require('../utils/response');
const config = require('../config/env');

function crearLimite({ minutos, maximo, mensaje }) {
  return rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) => enviarError(res, 429, mensaje),
  });
}

const limiteGeneral = crearLimite({
  minutos: 15,
  maximo: config.numero('API_LIMITE_PETICIONES', 300),
  mensaje: 'Demasiadas peticiones. Espera unos minutos antes de continuar.',
});

const limiteLogin = crearLimite({
  minutos: config.numero('AUTH_LIMITE_MINUTOS', 15),
  maximo: config.numero('AUTH_LIMITE_INTENTOS', 10),
  mensaje: 'Demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo.',
});

const limiteRegistro = crearLimite({
  minutos: 60,
  maximo: config.numero('REGISTRO_LIMITE_POR_HORA', 5),
  mensaje: 'Se crearon demasiadas cuentas desde esta conexión. Intenta de nuevo en una hora.',
});

const limiteSensible = crearLimite({
  minutos: 15,
  maximo: 10,
  mensaje: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.',
});

const limiteContacto = crearLimite({
  minutos: 10,
  maximo: config.numero('CONTACTO_LIMITE', 5),
  mensaje: 'Ya enviaste varios mensajes. Espera unos minutos antes de enviar otro.',
});

const limiteRecuperar = crearLimite({
  minutos: 60,
  maximo: 5,
  mensaje: 'Ya pediste varios enlaces de recuperación. Espera una hora antes de pedir otro.',
});

// Se mantiene el nombre anterior por compatibilidad.
const limiteAuth = limiteLogin;

module.exports = { limiteGeneral, limiteLogin, limiteRegistro, limiteSensible, limiteContacto, limiteRecuperar, limiteAuth };
