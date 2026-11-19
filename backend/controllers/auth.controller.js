const AuthService = require('../services/auth.service');
const { enviarExito } = require('../utils/response');

class AuthController {
  static async registrar(req, res) {
    const data = await AuthService.registrar(req.body);
    res.location(`${req.baseUrl}/perfil`);
    return enviarExito(res, { statusCode: 201, message: 'Usuario registrado correctamente', data });
  }

  static async iniciarSesion(req, res) {
    const data = await AuthService.iniciarSesion(req.body);
    return enviarExito(res, { statusCode: 200, message: 'Inicio de sesión exitoso', data });
  }

  static async cerrarSesion(req, res) {
    const data = AuthService.cerrarSesion(req.tokenPayload);
    return enviarExito(res, { statusCode: 200, message: 'Sesión cerrada. Elimina el token en el cliente', data });
  }

  static async perfil(req, res) {
    const data = await AuthService.perfil(req.usuario.id);
    return enviarExito(res, { statusCode: 200, data });
  }

  static async actualizarPerfil(req, res) {
    const data = await AuthService.actualizarPerfil(req.usuario.id, req.body);
    return enviarExito(res, { statusCode: 200, message: 'Perfil actualizado correctamente', data });
  }

  static async cambiarPassword(req, res) {
    const data = await AuthService.cambiarPassword(req.usuario.id, req.body);
    return enviarExito(res, { statusCode: 200, message: 'Contraseña actualizada correctamente', data });
  }
}

module.exports = AuthController;
