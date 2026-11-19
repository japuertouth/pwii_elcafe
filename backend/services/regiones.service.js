const { Op } = require('sequelize');
const { Region } = require('../models');
const AppError = require('../utils/AppError');
const { leerId, Validador, eliminarConReferencias } = require('../utils/validacion');

const OPCIONALES = ['departamentos', 'altitud', 'perfil_taza', 'descripcion', 'imagen_url'];

async function buscarOFallar(id) {
  const region = await Region.findByPk(id);
  if (!region) throw new AppError('Región no encontrada', 404);
  return region;
}

async function verificarDuplicado(nombre, idActual) {
  const where = { nombre };
  if (idActual) where.id = { [Op.ne]: idActual };
  if (await Region.findOne({ where })) throw new AppError(`Ya existe la región "${nombre}"`, 409);
}

function validar(body) {
  return new Validador(body)
    .texto('nombre', { obligatorio: true, max: 60, etiqueta: 'El nombre' })
    .texto('departamentos', { max: 150, nulo: true, etiqueta: 'Departamentos' })
    .texto('altitud', { max: 40, nulo: true, etiqueta: 'La altitud' })
    .texto('perfil_taza', { max: 200, nulo: true, etiqueta: 'El perfil de taza' })
    .texto('descripcion', { max: 600, nulo: true, etiqueta: 'La descripción' })
    .url('imagen_url', { max: 300, nulo: true, etiqueta: 'La imagen' })
    .resultado();
}

class RegionesService {
  static async listar() {
    const filas = await Region.findAll({ order: [['nombre', 'ASC']] });
    return filas.map((f) => f.toJSON());
  }

  static async obtener(idCrudo) {
    return (await buscarOFallar(leerId(idCrudo))).toJSON();
  }

  static async crear(body) {
    const datos = validar(body);
    await verificarDuplicado(datos.nombre);
    return (await Region.create(datos)).toJSON();
  }

  static async reemplazar(idCrudo, body) {
    const id = leerId(idCrudo);
    const region = await buscarOFallar(id);
    const datos = validar(body);
    OPCIONALES.forEach((campo) => {
      if (datos[campo] === undefined) datos[campo] = null;
    });
    await verificarDuplicado(datos.nombre, id);
    await region.update(datos);
    return region.toJSON();
  }

  static async eliminar(idCrudo) {
    const id = leerId(idCrudo);
    const region = await buscarOFallar(id);
    await eliminarConReferencias(region, 'No se puede eliminar: la región tiene registros asociados');
    return { id };
  }
}

module.exports = RegionesService;
