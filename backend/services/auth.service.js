const bcrypt = require('bcryptjs');
const { Usuario, Rol } = require('../models');
const AppError = require('../utils/AppError');
const config = require('../config/env');
const Reglas = require('../utils/reglas');
const { Validador } = require('../utils/validacion');
const seguridad = require('../utils/seguridad');

function aPublico(usuario) {
  const u = usuario.toJSON ? usuario.toJSON() : usuario;
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol_id: u.rol_id,
    rol: u.rol ? u.rol.nombre : null,
    activo: Boolean(u.activo),
    creado_en: u.creado_en,
    actualizado_en: u.actualizado_en,
  };
}

function respuestaConToken(usuario) {
  return {
    token: seguridad.firmarToken(usuario),
    tipo: 'Bearer',
    expira_en: config.jwt.expira,
    usuario: aPublico(usuario),
  };
}

/** Normaliza la contraseña (NFC) para que "á" escrita de dos formas genere el mismo hash. */
const normalizar = (password) => String(password).normalize('NFC');

/** Valida la contraseña con las reglas compartidas y, si falla, agrega el error al validador. */
function validarPassword(valor, campo, v, datosPersonales) {
  const errores = Reglas.erroresPassword(valor, datosPersonales);
  if (errores.length > 0) {
    v.error(campo, errores.length === 1 && errores[0].startsWith('La contraseña')
      ? errores[0]
      : `La contraseña debe cumplir: ${errores.join('; ').toLowerCase()}`);
  }
}

async function buscarConRol(where) {
  return Usuario.findOne({ where, include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }] });
}

const hashear = (password) => bcrypt.hash(normalizar(password), config.bcryptCosto);

class AuthService {
  static async registrar(body) {
    const v = new Validador(body)
      .nombrePersona('nombre', { obligatorio: true })
      .correo('correo', { obligatorio: true, bloquearTemporales: true });
    validarPassword(body.password, 'password', v, { nombre: body.nombre, correo: body.correo });
    if (body.confirmar_password !== undefined && body.confirmar_password !== body.password) {
      v.error('confirmar_password', 'Las contraseñas no coinciden');
    }
    const datos = v.resultado();

    const existente = await Usuario.findOne({ where: { correo: datos.correo } });
    if (existente) throw new AppError('Ya existe una cuenta registrada con ese correo', 409);

    // Solo se guardan los campos permitidos: el rol siempre es "usuario" (evita asignación masiva).
    const nuevo = await Usuario.create({
      nombre: datos.nombre,
      correo: datos.correo,
      password_hash: await hashear(body.password),
      rol_id: config.rolUsuario,
      activo: true,
    });
    return respuestaConToken(await buscarConRol({ id: nuevo.id }));
  }

  static async iniciarSesion(body) {
    const v = new Validador(body);
    const correo = typeof body.correo === 'string' ? Reglas.limpiarLinea(body.correo).toLowerCase() : '';
    if (!correo) v.error('correo', 'El correo es obligatorio');
    else if (correo.length > Reglas.CORREO_MAX) v.error('correo', 'El correo no tiene un formato válido');
    if (typeof body.password !== 'string' || body.password.length === 0) v.error('password', 'La contraseña es obligatoria');
    else if (body.password.length > 256) v.error('password', 'La contraseña es demasiado larga');
    v.resultado();

    seguridad.verificarBloqueo(correo);

    const usuario = await buscarConRol({ correo });
    const valida = await seguridad.compararPassword(normalizar(body.password), usuario ? usuario.password_hash : null);
    if (!valida) {
      seguridad.registrarFallo(correo);
      throw new AppError('Correo o contraseña incorrectos', 401);
    }
    seguridad.limpiarFallos(correo);
    if (!usuario.activo) throw new AppError('La cuenta está desactivada. Contacta al administrador', 403);

    // Si el hash se creó con un costo menor al actual, se actualiza de forma transparente.
    if (bcrypt.getRounds(usuario.password_hash) < config.bcryptCosto) {
      await usuario.update({ password_hash: await hashear(body.password) });
    }
    return respuestaConToken(usuario);
  }

  static cerrarSesion(payload) {
    seguridad.revocarToken(payload);
    return {
      instrucciones:
        'El token quedó revocado en el servidor. Bórralo también en el cliente, por ejemplo: ' +
        "sessionStorage.removeItem('token') o localStorage.removeItem('token').",
      expira_en: config.jwt.expira,
    };
  }

  static async perfil(idUsuario) {
    const usuario = await buscarConRol({ id: idUsuario });
    if (!usuario) throw new AppError('Usuario no encontrado', 404);
    return aPublico(usuario);
  }

  static async actualizarPerfil(idUsuario, body) {
    const v = new Validador(body, { parcial: true }).nombrePersona('nombre').correo('correo', { bloquearTemporales: true });
    const datos = v.resultado({ alMenosUno: ['nombre', 'correo'] });

    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario) throw new AppError('Usuario no encontrado', 404);

    if (datos.correo && datos.correo !== usuario.correo) {
      // Cambiar el correo es un cambio sensible: se pide la contraseña actual.
      if (typeof body.password_actual !== 'string' || body.password_actual.length === 0) {
        throw new AppError('Datos inválidos', 400, [{ campo: 'password_actual', mensaje: 'Para cambiar el correo escribe tu contraseña actual' }]);
      }
      if (!(await seguridad.compararPassword(normalizar(body.password_actual), usuario.password_hash))) {
        throw new AppError('Datos inválidos', 400, [{ campo: 'password_actual', mensaje: 'La contraseña actual no es correcta' }]);
      }
      const enUso = await Usuario.findOne({ where: { correo: datos.correo } });
      if (enUso) throw new AppError('Ese correo ya está en uso por otra cuenta', 409);
    }

    await usuario.update(datos);
    return AuthService.perfil(idUsuario);
  }

  static async cambiarPassword(idUsuario, body) {
    const v = new Validador(body);
    if (typeof body.password_actual !== 'string' || body.password_actual.length === 0) {
      v.error('password_actual', 'La contraseña actual es obligatoria');
    }
    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario) throw new AppError('Usuario no encontrado', 404);

    validarPassword(body.password_nueva, 'password_nueva', v, { nombre: usuario.nombre, correo: usuario.correo });
    if (typeof body.password_nueva === 'string' && body.password_nueva === body.password_actual) {
      v.error('password_nueva', 'La contraseña nueva debe ser diferente de la actual');
    }
    v.resultado();

    const coincide = await seguridad.compararPassword(normalizar(body.password_actual), usuario.password_hash);
    if (!coincide) {
      throw new AppError('Datos inválidos', 400, [{ campo: 'password_actual', mensaje: 'La contraseña actual no es correcta' }]);
    }

    await usuario.update({ password_hash: await hashear(body.password_nueva) });
    // El token actual queda invalidado (cambió la huella); se entrega uno nuevo.
    const actualizado = await buscarConRol({ id: idUsuario });
    return { id: usuario.id, ...respuestaConToken(actualizado) };
  }
}

AuthService.aPublico = aPublico;
module.exports = AuthService;
