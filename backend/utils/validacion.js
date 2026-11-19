const AppError = require('./AppError');
const Reglas = require('./reglas');

const INT_MAX = 2147483647;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);

function aEnteroPositivo(valor) {
  let n = null;
  if (typeof valor === 'number') n = valor;
  else if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) n = Number(valor.trim());
  return Number.isInteger(n) && n > 0 && n <= INT_MAX ? n : null;
}

function leerId(valor, campo = 'id') {
  const id = aEnteroPositivo(valor);
  if (!id) throw new AppError(`El parámetro "${campo}" debe ser un número entero positivo`, 400);
  return id;
}

function leerPaginacion(query = {}, { porDefecto = 10, maximo = 50 } = {}) {
  const page = query.page === undefined ? 1 : aEnteroPositivo(query.page);
  let limit = query.limit === undefined ? porDefecto : aEnteroPositivo(query.limit);
  if (!page || !limit) throw new AppError('Los parámetros "page" y "limit" deben ser enteros positivos', 400);
  limit = Math.min(limit, maximo);
  return { page, limit, offset: (page - 1) * limit };
}

function metaPaginacion(total, { page, limit }) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

function leerBooleanoQuery(valor, campo) {
  if (valor === undefined) return undefined;
  const texto = String(valor).trim().toLowerCase();
  if (['true', '1', 'si', 'sí'].includes(texto)) return true;
  if (['false', '0', 'no'].includes(texto)) return false;
  throw new AppError(`El parámetro "${campo}" debe ser true o false`, 400);
}

class Validador {
  constructor(body, { parcial = false } = {}) {
    if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
      throw new AppError('El cuerpo de la petición debe ser un objeto JSON', 400);
    }
    this.body = body;
    this.parcial = parcial;
    this.datos = {};
    this.errores = [];
  }

  debeValidar(campo, obligatorio) {
    return this.body[campo] !== undefined || (obligatorio && !this.parcial);
  }

  error(campo, mensaje) {
    this.errores.push({ campo, mensaje });
  }

  texto(campo, { obligatorio = false, min = 1, max, nulo = false, etiqueta = campo, multilinea = false } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = this.body[campo];
    if (nulo && (valor === null || (typeof valor === 'string' && valor.trim() === ''))) {
      this.datos[campo] = null;
      return this;
    }
    if (typeof valor !== 'string' || valor.trim() === '') {
      this.error(campo, `${etiqueta} es obligatorio y debe ser texto`);
      return this;
    }
    // Normaliza Unicode y elimina caracteres de control o invisibles.
    const limpio = multilinea ? Reglas.limpiarMultilinea(valor) : Reglas.limpiarLinea(valor);
    if (limpio === '') this.error(campo, `${etiqueta} es obligatorio y debe ser texto`);
    else if (limpio.length < min) this.error(campo, `${etiqueta} debe tener al menos ${min} caracteres`);
    else if (max && limpio.length > max) this.error(campo, `${etiqueta} no puede superar ${max} caracteres`);
    else this.datos[campo] = limpio;
    return this;
  }

  nombrePersona(campo, { obligatorio = false } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const r = Reglas.validarNombre(this.body[campo]);
    if (!r.ok) this.error(campo, r.mensaje.replace(/\.$/, ''));
    else this.datos[campo] = r.valor;
    return this;
  }

  correo(campo, { obligatorio = false, etiqueta = 'El correo', bloquearTemporales = false } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = this.body[campo];
    if (typeof valor !== 'string' || valor.trim() === '') {
      this.error(campo, `${etiqueta} es obligatorio`);
      return this;
    }
    const r = Reglas.validarCorreo(valor, { bloquearTemporales });
    if (!r.ok) this.error(campo, r.mensaje.replace(/\.$/, ''));
    else this.datos[campo] = r.valor;
    return this;
  }

  id(campo, { obligatorio = false, nulo = false, etiqueta = campo } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = this.body[campo];
    if (nulo && valor === null) {
      this.datos[campo] = null;
      return this;
    }
    const id = aEnteroPositivo(valor);
    if (!id) this.error(campo, `${etiqueta} debe ser un id válido${nulo ? ' o null' : ''}`);
    else this.datos[campo] = id;
    return this;
  }

  opcion(campo, opciones, { obligatorio = false, etiqueta = campo } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = typeof this.body[campo] === 'string' ? this.body[campo].trim().toLowerCase() : this.body[campo];
    if (!opciones.includes(valor)) this.error(campo, `${etiqueta} debe ser uno de: ${opciones.join(', ')}`);
    else this.datos[campo] = valor;
    return this;
  }

  booleano(campo, { obligatorio = false, etiqueta = campo } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = this.body[campo];
    if (typeof valor !== 'boolean') this.error(campo, `${etiqueta} debe ser true o false`);
    else this.datos[campo] = valor;
    return this;
  }

  url(campo, { obligatorio = false, max = 300, nulo = false, etiqueta = campo } = {}) {
    if (!this.debeValidar(campo, obligatorio)) return this;
    const valor = this.body[campo];
    if (nulo && (valor === null || valor === '')) {
      this.datos[campo] = null;
      return this;
    }
    if (typeof valor !== 'string' || valor.trim() === '') {
      this.error(campo, `${etiqueta} es obligatoria y debe ser texto`);
      return this;
    }
    const limpio = valor.trim();
    const valida = /^https?:\/\/\S+$/i.test(limpio) || /^[\w./-]+$/.test(limpio);
    if (!valida) this.error(campo, `${etiqueta} debe ser una URL http(s) o una ruta relativa sin espacios`);
    else if (limpio.length > max) this.error(campo, `${etiqueta} no puede superar ${max} caracteres`);
    else this.datos[campo] = limpio;
    return this;
  }

  resultado({ alMenosUno } = {}) {
    if (this.errores.length > 0) throw new AppError('Datos inválidos', 400, this.errores);
    if (alMenosUno && Object.keys(this.datos).length === 0) {
      throw new AppError(`Debes enviar al menos un campo para actualizar: ${alMenosUno.join(', ')}`, 400);
    }
    return this.datos;
  }
}

/** Rechaza claves peligrosas (prototype pollution) en cualquier nivel del JSON recibido. */
function contieneClavesProhibidas(valor, profundidad = 0) {
  if (profundidad > 20 || valor === null || typeof valor !== 'object') return false;
  return Object.keys(valor).some((k) => CLAVES_PROHIBIDAS.has(k) || contieneClavesProhibidas(valor[k], profundidad + 1));
}

function esAdministrador(usuario) {
  if (!usuario) return false;
  const rolAdmin = Number(process.env.ADMIN_ROL_ID || 1);
  const nombreRol = String(usuario.rol || '').toLowerCase();
  return usuario.rol_id === rolAdmin || nombreRol === 'admin' || nombreRol === 'administrador';
}

async function eliminarConReferencias(instancia, mensajeConflicto) {
  try {
    await instancia.destroy();
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') throw new AppError(mensajeConflicto, 409);
    throw error;
  }
}

module.exports = {
  aEnteroPositivo,
  leerId,
  leerPaginacion,
  metaPaginacion,
  leerBooleanoQuery,
  Validador,
  esAdministrador,
  eliminarConReferencias,
  contieneClavesProhibidas,
  FORMATO_CORREO,
};
