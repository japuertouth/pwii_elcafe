const S = require('../services/contacto.service');
const { enviarExito } = require('../utils/response');

class ContactoController {
  static async crear(req, res) {
    const data = await S.crear(req.body, req.usuario);
    if (data.id) res.location(`${req.baseUrl}/${data.id}`);
    return enviarExito(res, { statusCode: 201, message: 'Mensaje enviado correctamente. ¡Gracias por escribirnos!', data });
  }

  static async listar(req, res) {
    const { items, meta } = await S.listar(req.query);
    return enviarExito(res, { statusCode: 200, data: items, meta });
  }

  static async obtener(req, res) {
    const data = await S.obtener(req.params.id);
    return enviarExito(res, { statusCode: 200, data });
  }

  static async marcarLeido(req, res) {
    const data = await S.marcarLeido(req.params.id, req.body);
    return enviarExito(res, { statusCode: 200, message: data.leido ? 'Mensaje marcado como leído' : 'Mensaje marcado como no leído', data });
  }

  static async eliminar(req, res) {
    const data = await S.eliminar(req.params.id);
    return enviarExito(res, { statusCode: 200, message: 'Mensaje eliminado correctamente', data });
  }
}

module.exports = ContactoController;
