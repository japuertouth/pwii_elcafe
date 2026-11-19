const { Op } = require('sequelize');
const { Categoria, Curiosidad, Galeria } = require('../models');
const AppError = require('../utils/AppError');
const { leerId, Validador } = require('../utils/validacion');

const TIPOS = ['curiosidad', 'galeria'];

async function buscarOFallar(id) {
  const categoria = await Categoria.findByPk(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404);
  return categoria;
}

async function contarUsos(id) {
  const [curiosidades, fotos] = await Promise.all([
    Curiosidad.count({ where: { categoria_id: id } }),
    Galeria.count({ where: { categoria_id: id } }),
  ]);
  return curiosidades + fotos;
}

async function verificarDuplicado({ nombre, tipo }, idActual) {
  const where = { nombre, tipo };
  if (idActual) where.id = { [Op.ne]: idActual };
  if (await Categoria.findOne({ where })) {
    throw new AppError(`Ya existe la categoría "${nombre}" de tipo "${tipo}"`, 409);
  }
}

function validar(body) {
  return new Validador(body)
    .texto('nombre', { obligatorio: true, max: 60, etiqueta: 'El nombre' })
    .opcion('tipo', TIPOS, { obligatorio: true, etiqueta: 'El tipo' })
    .resultado();
}

class CategoriasService {
  static async listar(query = {}) {
    const where = {};
    if (query.tipo !== undefined) {
      const tipo = String(query.tipo).trim().toLowerCase();
      if (!TIPOS.includes(tipo)) throw new AppError(`El parámetro "tipo" debe ser uno de: ${TIPOS.join(', ')}`, 400);
      where.tipo = tipo;
    }
    const filas = await Categoria.findAll({ where, order: [['tipo', 'ASC'], ['nombre', 'ASC']] });
    return filas.map((f) => f.toJSON());
  }

  static async obtener(idCrudo) {
    return (await buscarOFallar(leerId(idCrudo))).toJSON();
  }

  static async crear(body) {
    const datos = validar(body);
    await verificarDuplicado(datos);
    return (await Categoria.create(datos)).toJSON();
  }

  static async reemplazar(idCrudo, body) {
    const id = leerId(idCrudo);
    const categoria = await buscarOFallar(id);
    const datos = validar(body);
    await verificarDuplicado(datos, id);
    if (datos.tipo !== categoria.tipo && (await contarUsos(id)) > 0) {
      throw new AppError('No se puede cambiar el tipo: la categoría ya tiene curiosidades o fotos asociadas', 409);
    }
    await categoria.update(datos);
    return categoria.toJSON();
  }

  static async eliminar(idCrudo) {
    const id = leerId(idCrudo);
    const categoria = await buscarOFallar(id);
    if ((await contarUsos(id)) > 0) {
      throw new AppError('No se puede eliminar: la categoría tiene curiosidades o fotos asociadas', 409);
    }
    await categoria.destroy();
    return { id };
  }
}

module.exports = CategoriasService;
