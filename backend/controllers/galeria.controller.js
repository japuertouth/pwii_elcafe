const S = require('../services/galeria.service');
const { enviarExito } = require('../utils/response');

class GaleriaController {
  static async listar(req, res) {
    const { items, meta } = await S.listar(req.query);
    return enviarExito(res, { statusCode: 200, data: items, meta });
  }

  static async obtener(req, res) {
    const data = await S.obtener(req.params.id);
    return enviarExito(res, { statusCode: 200, data });
  }

  static async crear(req, res) {
    const data = await S.crear(req.body, req.usuario);
    res.location(`${req.baseUrl}/${data.id}`);
    return enviarExito(res, { statusCode: 201, message: 'Foto creada correctamente', data });
  }

  static async reemplazar(req, res) {
    const data = await S.reemplazar(req.params.id, req.body);
    return enviarExito(res, { statusCode: 200, message: 'Foto actualizada correctamente', data });
  }

  static async eliminar(req, res) {
    const data = await S.eliminar(req.params.id);
    return enviarExito(res, { statusCode: 200, message: 'Foto eliminada correctamente', data });
  }
}

module.exports = GaleriaController;
