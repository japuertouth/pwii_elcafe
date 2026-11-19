const { Router } = require('express');
const CuriosidadesController = require('../controllers/curiosidades.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { autenticacionOpcional } = require('../middlewares/authOpcional.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');

const router = Router();

router.get('/', CuriosidadesController.listar);
router.get('/aleatoria', CuriosidadesController.obtenerAleatoria);
router.get('/pendientes', verificarToken, soloAdmin, CuriosidadesController.pendientes);
// Con sesión, el autor y los administradores también pueden ver una curiosidad pendiente.
router.get('/:id', autenticacionOpcional, CuriosidadesController.obtenerPorId);

router.post('/', verificarToken, CuriosidadesController.crear);
router.put('/:id', verificarToken, CuriosidadesController.reemplazar);
router.patch('/:id/moderacion', verificarToken, soloAdmin, CuriosidadesController.moderar);
router.patch('/:id', verificarToken, CuriosidadesController.actualizarParcial);
router.delete('/:id', verificarToken, CuriosidadesController.eliminar);

module.exports = router;
