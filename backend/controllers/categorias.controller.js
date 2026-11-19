const S = require('../services/categorias.service');
const { enviarExito } = require('../utils/response');

class CategoriasController {
  static async listar(req, res) {
    const data = await S.listar(req.query);
    return enviarExito(res, { statusCode: 200, data, meta: { total: data.length } });
  }

  static async obtener(req, res) {
    const data = await S.obtener(req.params.id);
    return enviarExito(res, { statusCode: 200, data });
  }

  static async crear(req, res) {
    const data = await S.crear(req.body);
    res.location(`${req.baseUrl}/${data.id}`);
    return enviarExito(res, { statusCode: 201, message: 'Categoría creada correctamente', data });
  }

  static async reemplazar(req, res) {
    const data = await S.reemplazar(req.params.id, req.body);
    return enviarExito(res, { statusCode: 200, message: 'Categoría actualizada correctamente', data });
  }

  static async eliminar(req, res) {
    const data = await S.eliminar(req.params.id);
    return enviarExito(res, { statusCode: 200, message: 'Categoría eliminada correctamente', data });
  }
}

module.exports = CategoriasController;
