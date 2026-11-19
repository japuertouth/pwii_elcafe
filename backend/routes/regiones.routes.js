const { Router } = require('express');
const RegionesController = require('../controllers/regiones.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');

const router = Router();

router.get('/', RegionesController.listar);
router.get('/:id', RegionesController.obtener);

router.post('/', verificarToken, soloAdmin, RegionesController.crear);
router.put('/:id', verificarToken, soloAdmin, RegionesController.reemplazar);
router.delete('/:id', verificarToken, soloAdmin, RegionesController.eliminar);

module.exports = router;
