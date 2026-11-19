const CuriosidadesService = require('../services/curiosidades.service');
const { enviarExito } = require('../utils/response');

class CuriosidadesController {
  static async listar(req, res, next) {
    try {
      const { items, meta } = await CuriosidadesService.listar(req.query);
      return enviarExito(res, { statusCode: 200, data: items, meta });
    } catch (error) {
      return next(error);
    }
  }

  static async obtenerAleatoria(req, res, next) {
    try {
      const curiosidad = await CuriosidadesService.obtenerAleatoria(req.query);
      return enviarExito(res, { statusCode: 200, data: curiosidad });
    } catch (error) {
      return next(error);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const curiosidad = await CuriosidadesService.obtenerPorId(req.params.id);
      return enviarExito(res, { statusCode: 200, data: curiosidad });
    } catch (error) {
      return next(error);
    }
  }

  static async crear(req, res, next) {
    try {
      const nueva = await CuriosidadesService.crear(req.body, req.usuario);
      res.location(`${req.baseUrl}/${nueva.id}`);
      return enviarExito(res, { statusCode: 201, message: 'Curiosidad creada correctamente', data: nueva });
    } catch (error) {
      return next(error);
    }
  }

  static async reemplazar(req, res, next) {
    try {
      const actualizada = await CuriosidadesService.reemplazar(req.params.id, req.body, req.usuario);
      return enviarExito(res, { statusCode: 200, message: 'Curiosidad actualizada correctamente', data: actualizada });
    } catch (error) {
      return next(error);
    }
  }

  static async actualizarParcial(req, res, next) {
    try {
      const actualizada = await CuriosidadesService.actualizarParcial(req.params.id, req.body, req.usuario);
      return enviarExito(res, { statusCode: 200, message: 'Curiosidad actualizada correctamente', data: actualizada });
    } catch (error) {
      return next(error);
    }
  }

  static async eliminar(req, res, next) {
    try {
      const resultado = await CuriosidadesService.eliminar(req.params.id, req.usuario);
      return enviarExito(res, { statusCode: 200, message: 'Curiosidad eliminada correctamente', data: resultado });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = CuriosidadesController;
