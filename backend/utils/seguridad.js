/* Utilidades de seguridad: firma/verificación de JWT, revocación de sesiones
   y bloqueo temporal de cuentas por intentos fallidos. */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const AppError = require('./AppError');

/* ---------- JWT ---------- */

/** Huella corta del hash de la contraseña: si la contraseña cambia, los tokens anteriores dejan de valer. */
function huellaPassword(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash || '')).digest('base64url').slice(0, 16);
}

function exigirSecreto() {
  const { secreto } = config.jwt;
  if (!secreto) throw new AppError('Configuración del servidor incompleta', 503);
  return secreto;
}

function firmarToken(usuario) {
  const { expira, emisor, audiencia } = config.jwt;
  const payload = {
    id: usuario.id,
    correo: usuario.correo,
    rol_id: usuario.rol_id,
    rol: usuario.rol ? usuario.rol.nombre : undefined,
    ver: huellaPassword(usuario.password_hash),
  };
  return jwt.sign(payload, exigirSecreto(), {
    algorithm: 'HS256',
    expiresIn: expira,
    issuer: emisor,
    audience: audiencia,
    subject: String(usuario.id),
    jwtid: crypto.randomUUID(),
  });
}

function verificarFirma(token) {
  const { emisor, audiencia } = config.jwt;
  return jwt.verify(token, exigirSecreto(), {
    algorithms: ['HS256'],
    issuer: emisor,
    audience: audiencia,
    clockTolerance: 5,
  });
}

/* ---------- Enlace para restablecer la contraseña ----------
   Token firmado de un solo uso: lleva la huella de la contraseña actual, así que deja de
   servir en cuanto la contraseña cambia. Vence a los 30 minutos. */
const AUDIENCIA_RESTABLECER = 'cafe-hondureno-restablecer';

function firmarTokenRestablecer(usuario) {
  return jwt.sign({ ver: huellaPassword(usuario.password_hash) }, exigirSecreto(), {
    algorithm: 'HS256',
    expiresIn: '30m',
    issuer: config.jwt.emisor,
    audience: AUDIENCIA_RESTABLECER,
    subject: String(usuario.id),
    jwtid: crypto.randomUUID(),
  });
}

function verificarTokenRestablecer(token) {
  try {
    return jwt.verify(String(token || ''), exigirSecreto(), {
      algorithms: ['HS256'],
      issuer: config.jwt.emisor,
      audience: AUDIENCIA_RESTABLECER,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error.name === 'TokenExpiredError'
        ? 'El enlace venció. Pide uno nuevo desde "¿Olvidaste tu contraseña?"'
        : 'El enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?"',
      400
    );
  }
}

/* Límite de correos de recuperación por dirección (evita llenar el buzón de alguien). */
const solicitudes = new Map();
function permitirSolicitud(correo, { maximo = 3, minutos = 60 } = {}) {
  const clave = claveIntento(correo);
  const ahora = Date.now();
  const lista = (solicitudes.get(clave) || []).filter((t) => t > ahora - minutos * 60000);
  if (lista.length >= maximo) return false;
  lista.push(ahora);
  solicitudes.set(clave, lista);
  if (solicitudes.size > 10000) solicitudes.clear();
  return true;
}

/* ---------- Revocación (logout) ----------
   Lista en memoria de tokens cerrados hasta que expiran. En Vercel cada instancia
   tiene su propia memoria, por eso el token también caduca a las pocas horas. */
const revocados = new Map();

function revocarToken(payload) {
  if (!payload || !payload.jti) return;
  revocados.set(payload.jti, (payload.exp || 0) * 1000);
  if (revocados.size > 5000) limpiarRevocados();
}

function estaRevocado(jti) {
  const hasta = revocados.get(jti);
  if (hasta === undefined) return false;
  if (hasta < Date.now()) {
    revocados.delete(jti);
    return false;
  }
  return true;
}

function limpiarRevocados() {
  const ahora = Date.now();
  for (const [jti, hasta] of revocados) if (hasta < ahora) revocados.delete(jti);
}

/* ---------- Bloqueo por intentos fallidos ----------
   Se cuenta por correo (exista o no la cuenta, para no revelar cuáles existen). */
const MAX_FALLOS = config.numero('LOGIN_MAX_FALLOS', 5, { min: 3, max: 20 });
const MINUTOS_BLOQUEO = config.numero('LOGIN_MINUTOS_BLOQUEO', 15, { min: 1, max: 1440 });
const intentos = new Map();

function claveIntento(correo) {
  return crypto.createHash('sha256').update(String(correo || '').toLowerCase()).digest('hex');
}

function verificarBloqueo(correo) {
  const registro = intentos.get(claveIntento(correo));
  if (!registro || !registro.hasta) return;
  const restante = registro.hasta - Date.now();
  if (restante > 0) {
    const minutos = Math.ceil(restante / 60000);
    throw new AppError(
      `Demasiados intentos fallidos. Por seguridad, espera ${minutos} minuto${minutos === 1 ? '' : 's'} antes de volver a intentarlo.`,
      429
    );
  }
  intentos.delete(claveIntento(correo));
}

function registrarFallo(correo) {
  const clave = claveIntento(correo);
  const registro = intentos.get(clave) || { fallos: 0, hasta: 0, bloqueos: 0 };
  registro.fallos += 1;
  if (registro.fallos >= MAX_FALLOS) {
    registro.bloqueos += 1;
    // Bloqueo progresivo: 15, 30, 60 ... minutos (máximo 24 h).
    const minutos = Math.min(MINUTOS_BLOQUEO * 2 ** (registro.bloqueos - 1), 1440);
    registro.hasta = Date.now() + minutos * 60000;
    registro.fallos = 0;
  }
  intentos.set(clave, registro);
  if (intentos.size > 10000) {
    const ahora = Date.now();
    for (const [k, r] of intentos) if (!r.hasta || r.hasta < ahora) intentos.delete(k);
  }
}

function limpiarFallos(correo) {
  intentos.delete(claveIntento(correo));
}

/* ---------- Comparación en tiempo constante ----------
   Si el correo no existe se compara contra un hash ficticio para que la respuesta
   tarde lo mismo y no se pueda averiguar qué correos están registrados. */
let hashFicticio;
async function compararPassword(password, hash) {
  if (!hash) {
    hashFicticio ||= await bcrypt.hash(crypto.randomBytes(16).toString('hex'), config.bcryptCosto);
    await bcrypt.compare(String(password), hashFicticio);
    return false;
  }
  return bcrypt.compare(String(password), hash);
}

module.exports = {
  huellaPassword,
  firmarToken,
  verificarFirma,
  revocarToken,
  estaRevocado,
  verificarBloqueo,
  registrarFallo,
  limpiarFallos,
  compararPassword,
  firmarTokenRestablecer,
  verificarTokenRestablecer,
  permitirSolicitud,
  _reiniciar() {
    revocados.clear();
    intentos.clear();
    solicitudes.clear();
  },
};
