const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { limiteLogin, limiteRegistro, limiteSensible, limiteRecuperar } = require('../middlewares/rateLimit.middleware');

const router = Router();

router.post('/registro', limiteRegistro, AuthController.registrar);
router.post('/login', limiteLogin, AuthController.iniciarSesion);
router.post('/recuperar', limiteRecuperar, AuthController.recuperar);
router.post('/restablecer', limiteSensible, AuthController.restablecer);

router.post('/logout', verificarToken, AuthController.cerrarSesion);
router.get('/perfil', verificarToken, AuthController.perfil);
router.patch('/perfil', limiteSensible, verificarToken, AuthController.actualizarPerfil);
router.patch('/password', limiteSensible, verificarToken, AuthController.cambiarPassword);

module.exports = router;
