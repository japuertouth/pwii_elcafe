const S = require('../services/usuarios.service');
const { enviarExito } = require('../utils/response');

class UsuariosController {
  static async listar(req, res) {
    const { items, meta } = await S.listar(req.query);
    return enviarExito(res, { statusCode: 200, data: items, meta });
  }

  static async obtener(req, res) {
    const data = await S.obtener(req.params.id);
    return enviarExito(res, { statusCode: 200, data });
  }

  static async actualizar(req, res) {
    const data = await S.actualizar(req.params.id, req.body, req.usuario);
    return enviarExito(res, { statusCode: 200, message: 'Usuario actualizado correctamente', data });
  }
}

module.exports = UsuariosController;
