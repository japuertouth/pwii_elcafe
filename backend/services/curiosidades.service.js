const { Curiosidad, Categoria, Region } = require('../models');
const AppError = require('../utils/AppError');
const Reglas = require('../utils/reglas');

const MAX_TITULO = 150;
const MAX_DESCRIPCION = 1000;
const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 50;
const INT_MAX = 2147483647;

function aEnteroPositivo(valor) {
  let n = null;
  if (typeof valor === 'number') n = valor;
  else if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) n = Number(valor.trim());
  return Number.isInteger(n) && n > 0 && n <= INT_MAX ? n : null;
}

function leerId(valor) {
  const id = aEnteroPositivo(valor);
  if (!id) throw new AppError('El id debe ser un número entero positivo', 400);
  return id;
}

function leerIdDeQuery(campo, valor) {
  const id = aEnteroPositivo(valor);
  if (!id) throw new AppError(`El parámetro "${campo}" debe ser un número entero positivo`, 400);
  return id;
}

function validarCuerpo(body, { parcial }) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('El cuerpo de la petición debe ser un objeto JSON', 400);
  }

  const errores = [];
  const datos = {};
  const obligatorio = !parcial;

  if (body.titulo !== undefined || obligatorio) {
    const titulo = typeof body.titulo === 'string' ? Reglas.limpiarLinea(body.titulo) : '';
    if (titulo === '') {
      errores.push({ campo: 'titulo', mensaje: 'El título es obligatorio y debe ser texto' });
    } else if (titulo.length > MAX_TITULO) {
      errores.push({ campo: 'titulo', mensaje: `El título no puede superar ${MAX_TITULO} caracteres` });
    } else {
      datos.titulo = titulo;
    }
  }

  if (body.descripcion !== undefined || obligatorio) {
    const descripcion = typeof body.descripcion === 'string' ? Reglas.limpiarMultilinea(body.descripcion) : '';
    if (descripcion === '') {
      errores.push({ campo: 'descripcion', mensaje: 'La descripción es obligatoria y debe ser texto' });
    } else if (descripcion.length > MAX_DESCRIPCION) {
      errores.push({ campo: 'descripcion', mensaje: `La descripción no puede superar ${MAX_DESCRIPCION} caracteres` });
    } else {
      datos.descripcion = descripcion;
    }
  }

  if (body.categoria_id !== undefined || obligatorio) {
    const categoriaId = aEnteroPositivo(body.categoria_id);
    if (!categoriaId) {
      errores.push({ campo: 'categoria_id', mensaje: 'La categoría es obligatoria y debe ser un id válido' });
    } else {
      datos.categoria_id = categoriaId;
    }
  }

  if (body.region_id !== undefined) {
    if (body.region_id === null) {
      datos.region_id = null;
    } else {
      const regionId = aEnteroPositivo(body.region_id);
      if (!regionId) errores.push({ campo: 'region_id', mensaje: 'La región debe ser un id válido o null' });
      else datos.region_id = regionId;
    }
  }

  if (errores.length > 0) throw new AppError('Datos inválidos', 400, errores);
  return datos;
}

async function verificarReferencias(datos) {
  const errores = [];

  if (datos.categoria_id !== undefined) {
    const categoria = await Categoria.findByPk(datos.categoria_id);
    if (!categoria) {
      errores.push({ campo: 'categoria_id', mensaje: 'La categoría indicada no existe' });
    } else if (categoria.tipo !== 'curiosidad') {
      errores.push({ campo: 'categoria_id', mensaje: 'La categoría debe ser de tipo "curiosidad"' });
    }
  }

  if (datos.region_id) {
    const region = await Region.findByPk(datos.region_id);
    if (!region) errores.push({ campo: 'region_id', mensaje: 'La región indicada no existe' });
  }

  if (errores.length > 0) throw new AppError('Datos inválidos', 400, errores);
}

function esAdministrador(usuario) {
  const rolAdmin = Number(process.env.ADMIN_ROL_ID || 1);
  const nombreRol = String(usuario.rol || '').toLowerCase();
  return usuario.rol_id === rolAdmin || nombreRol === 'admin' || nombreRol === 'administrador';
}

function verificarPermiso(usuario, curiosidad) {
  const esAutor = curiosidad.creado_por !== null && Number(curiosidad.creado_por) === usuario.id;
  if (!esAutor && !esAdministrador(usuario)) {
    throw new AppError('No tienes permiso para modificar o eliminar esta curiosidad', 403);
  }
}

async function buscarOFallar(id) {
  const curiosidad = await Curiosidad.obtenerPorId(id);
  if (!curiosidad) throw new AppError('Curiosidad no encontrada', 404);
  return curiosidad;
}

class CuriosidadesService {
  static async listar(query = {}) {
    const page = query.page === undefined ? 1 : aEnteroPositivo(query.page);
    let limit = query.limit === undefined ? LIMITE_POR_DEFECTO : aEnteroPositivo(query.limit);
    if (!page || !limit) throw new AppError('Los parámetros "page" y "limit" deben ser enteros positivos', 400);
    limit = Math.min(limit, LIMITE_MAXIMO);

    const filtros = { page, limit };
    if (query.categoria_id !== undefined) filtros.categoriaId = leerIdDeQuery('categoria_id', query.categoria_id);
    if (query.region_id !== undefined) filtros.regionId = leerIdDeQuery('region_id', query.region_id);

    for (const [parametro, clave] of [['categoria', 'categoriaNombre'], ['q', 'texto']]) {
      if (query[parametro] === undefined) continue;
      if (typeof query[parametro] !== 'string') throw new AppError(`El parámetro "${parametro}" debe ser texto`, 400);
      if (query[parametro].trim() !== '') filtros[clave] = query[parametro].trim();
    }

    const { count, rows } = await Curiosidad.listar(filtros);
    return {
      items: rows.map((fila) => fila.toJSON()),
      meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    };
  }

  static async obtenerAleatoria(query = {}) {
    const filtros = {};
    if (query.excluir !== undefined) filtros.excluirId = leerIdDeQuery('excluir', query.excluir);
    if (query.categoria_id !== undefined) filtros.categoriaId = leerIdDeQuery('categoria_id', query.categoria_id);

    const curiosidad = await Curiosidad.obtenerAleatoria(filtros);
    if (!curiosidad) throw new AppError('No hay curiosidades disponibles', 404);
    return curiosidad.toJSON();
  }

  static async obtenerPorId(idCrudo) {
    const curiosidad = await buscarOFallar(leerId(idCrudo));
    return curiosidad.toJSON();
  }

  static async crear(body, usuario) {
    const datos = validarCuerpo(body, { parcial: false });
    await verificarReferencias(datos);
    const nueva = await Curiosidad.crearYObtener({ ...datos, creado_por: usuario.id });
    return nueva.toJSON();
  }

  static async reemplazar(idCrudo, body, usuario) {
    const id = leerId(idCrudo);
    const actual = await buscarOFallar(id);
    verificarPermiso(usuario, actual);

    const datos = validarCuerpo(body, { parcial: false });
    if (datos.region_id === undefined) datos.region_id = null;
    await verificarReferencias(datos);

    const actualizada = await Curiosidad.actualizarYObtener(actual, datos);
    return actualizada.toJSON();
  }

  static async actualizarParcial(idCrudo, body, usuario) {
    const id = leerId(idCrudo);
    const actual = await buscarOFallar(id);
    verificarPermiso(usuario, actual);

    const datos = validarCuerpo(body, { parcial: true });
    if (Object.keys(datos).length === 0) {
      throw new AppError('Debes enviar al menos un campo para actualizar: titulo, descripcion, categoria_id o region_id', 400);
    }
    await verificarReferencias(datos);

    const actualizada = await Curiosidad.actualizarYObtener(actual, datos);
    return actualizada.toJSON();
  }

  static async eliminar(idCrudo, usuario) {
    const id = leerId(idCrudo);
    const actual = await buscarOFallar(id);
    verificarPermiso(usuario, actual);

    await Curiosidad.eliminar(actual);
    return { id };
  }
}

module.exports = CuriosidadesService;
