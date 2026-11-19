const { Router } = require('express');
const CategoriasController = require('../controllers/categorias.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');

const router = Router();

router.get('/', CategoriasController.listar);
router.get('/:id', CategoriasController.obtener);

router.post('/', verificarToken, soloAdmin, CategoriasController.crear);
router.put('/:id', verificarToken, soloAdmin, CategoriasController.reemplazar);
router.delete('/:id', verificarToken, soloAdmin, CategoriasController.eliminar);

module.exports = router;
