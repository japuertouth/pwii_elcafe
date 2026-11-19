const { Router } = require('express');
const CuriosidadesController = require('../controllers/curiosidades.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/', CuriosidadesController.listar);
router.get('/aleatoria', CuriosidadesController.obtenerAleatoria);
router.get('/:id', CuriosidadesController.obtenerPorId);

router.post('/', verificarToken, CuriosidadesController.crear);
router.put('/:id', verificarToken, CuriosidadesController.reemplazar);
router.patch('/:id', verificarToken, CuriosidadesController.actualizarParcial);
router.delete('/:id', verificarToken, CuriosidadesController.eliminar);

module.exports = router;
