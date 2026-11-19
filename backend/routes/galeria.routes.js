const { Router } = require('express');
const GaleriaController = require('../controllers/galeria.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');

const router = Router();

router.get('/', GaleriaController.listar);
router.get('/:id', GaleriaController.obtener);

router.post('/', verificarToken, soloAdmin, GaleriaController.crear);
router.put('/:id', verificarToken, soloAdmin, GaleriaController.reemplazar);
router.delete('/:id', verificarToken, soloAdmin, GaleriaController.eliminar);

module.exports = router;
