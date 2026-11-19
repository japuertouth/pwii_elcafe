const { Galeria, Categoria, Region, Usuario } = require('../models');
const AppError = require('../utils/AppError');
const { leerId, leerPaginacion, metaPaginacion, Validador } = require('../utils/validacion');

const relaciones = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'tipo'] },
  { model: Region, as: 'region', attributes: ['id', 'nombre'] },
  { model: Usuario, as: 'autor', attributes: ['id', 'nombre'] },
];

async function buscarOFallar(id) {
  const foto = await Galeria.findByPk(id, { include: relaciones });
  if (!foto) throw new AppError('Foto no encontrada', 404);
  return foto;
}

function validar(body) {
  return new Validador(body)
    .texto('titulo', { obligatorio: true, max: 120, etiqueta: 'El título' })
    .texto('descripcion', { max: 400, nulo: true, etiqueta: 'La descripción' })
    .url('imagen_url', { obligatorio: true, max: 300, etiqueta: 'La imagen' })
    .id('categoria_id', { obligatorio: true, etiqueta: 'La categoría' })
    .id('region_id', { nulo: true, etiqueta: 'La región' })
    .resultado();
}

async function verificarReferencias(datos) {
  const errores = [];
  const categoria = await Categoria.findByPk(datos.categoria_id);
  if (!categoria) errores.push({ campo: 'categoria_id', mensaje: 'La categoría indicada no existe' });
  else if (categoria.tipo !== 'galeria') errores.push({ campo: 'categoria_id', mensaje: 'La categoría debe ser de tipo "galeria"' });
  if (datos.region_id && !(await Region.findByPk(datos.region_id))) {
    errores.push({ campo: 'region_id', mensaje: 'La región indicada no existe' });
  }
  if (errores.length > 0) throw new AppError('Datos inválidos', 400, errores);
}

class GaleriaService {
  static async listar(query = {}) {
    const paginacion = leerPaginacion(query, { porDefecto: 12 });
    const where = {};
    if (query.categoria_id !== undefined) where.categoria_id = leerId(query.categoria_id, 'categoria_id');
    if (query.region_id !== undefined) where.region_id = leerId(query.region_id, 'region_id');

    const { count, rows } = await Galeria.findAndCountAll({
      where,
      include: relaciones,
      order: [['creado_en', 'DESC'], ['id', 'DESC']],
      limit: paginacion.limit,
      offset: paginacion.offset,
      distinct: true,
    });
    return { items: rows.map((f) => f.toJSON()), meta: metaPaginacion(count, paginacion) };
  }

  static async obtener(idCrudo) {
    return (await buscarOFallar(leerId(idCrudo))).toJSON();
  }

  static async crear(body, usuario) {
    const datos = validar(body);
    await verificarReferencias(datos);
    const nueva = await Galeria.create({ ...datos, subido_por: usuario.id });
    return (await buscarOFallar(nueva.id)).toJSON();
  }

  static async reemplazar(idCrudo, body) {
    const id = leerId(idCrudo);
    const foto = await buscarOFallar(id);
    const datos = validar(body);
    if (datos.descripcion === undefined) datos.descripcion = null;
    if (datos.region_id === undefined) datos.region_id = null;
    await verificarReferencias(datos);
    await foto.update(datos);
    return (await buscarOFallar(id)).toJSON();
  }

  static async eliminar(idCrudo) {
    const id = leerId(idCrudo);
    const foto = await buscarOFallar(id);
    await foto.destroy();
    return { id };
  }
}

module.exports = GaleriaService;
