const { Router } = require('express');
const UsuariosController = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');

const router = Router();

router.get('/', verificarToken, soloAdmin, UsuariosController.listar);
router.get('/:id', verificarToken, soloAdmin, UsuariosController.obtener);
router.patch('/:id', verificarToken, soloAdmin, UsuariosController.actualizar);

module.exports = router;
