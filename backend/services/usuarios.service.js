const { Op } = require('sequelize');
const { Usuario, Rol } = require('../models');
const AppError = require('../utils/AppError');
const { leerId, leerPaginacion, metaPaginacion, leerBooleanoQuery, Validador, aEnteroPositivo } = require('../utils/validacion');
const { aPublico } = require('./auth.service');

const incluirRol = [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }];
const ATRIBUTOS = { exclude: ['password_hash'] };
const escaparLike = (texto) => texto.replace(/[%_[]/g, '[$&]');

async function buscarOFallar(id) {
  const usuario = await Usuario.findByPk(id, { attributes: ATRIBUTOS, include: incluirRol });
  if (!usuario) throw new AppError('Usuario no encontrado', 404);
  return usuario;
}

class UsuariosService {
  static async listar(query = {}) {
    const paginacion = leerPaginacion(query);
    const where = {};
    if (query.rol_id !== undefined) where.rol_id = leerId(query.rol_id, 'rol_id');
    const activo = leerBooleanoQuery(query.activo, 'activo');
    if (activo !== undefined) where.activo = activo;
    if (typeof query.q === 'string' && query.q.trim() !== '') {
      const patron = `%${escaparLike(query.q.trim())}%`;
      where[Op.or] = [{ nombre: { [Op.like]: patron } }, { correo: { [Op.like]: patron } }];
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      attributes: ATRIBUTOS,
      include: incluirRol,
      order: [['id', 'ASC']],
      limit: paginacion.limit,
      offset: paginacion.offset,
      distinct: true,
    });
    return { items: rows.map(aPublico), meta: metaPaginacion(count, paginacion) };
  }

  static async obtener(idCrudo) {
    return aPublico(await buscarOFallar(leerId(idCrudo)));
  }

  static async actualizar(idCrudo, body, admin) {
    const id = leerId(idCrudo);
    const datos = new Validador(body, { parcial: true })
      .id('rol_id', { etiqueta: 'El rol' })
      .booleano('activo')
      .resultado({ alMenosUno: ['rol_id', 'activo'] });

    const usuario = await buscarOFallar(id);

    if (id === admin.id && (datos.activo === false || (datos.rol_id && datos.rol_id !== usuario.rol_id))) {
      throw new AppError('No puedes desactivarte ni quitarte el rol de administrador a ti mismo', 400);
    }
    if (datos.rol_id) {
      const rol = await Rol.findByPk(aEnteroPositivo(datos.rol_id));
      if (!rol) throw new AppError('Datos inválidos', 400, [{ campo: 'rol_id', mensaje: 'El rol indicado no existe' }]);
    }

    await usuario.update(datos);
    return aPublico(await buscarOFallar(id));
  }
}

module.exports = UsuariosService;
