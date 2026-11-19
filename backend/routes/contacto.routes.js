const { Router } = require('express');
const ContactoController = require('../controllers/contacto.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { autenticacionOpcional } = require('../middlewares/authOpcional.middleware');
const { soloAdmin } = require('../middlewares/rol.middleware');
const { limiteContacto } = require('../middlewares/rateLimit.middleware');

const router = Router();

router.post('/', limiteContacto, autenticacionOpcional, ContactoController.crear);

router.get('/', verificarToken, soloAdmin, ContactoController.listar);
router.get('/:id', verificarToken, soloAdmin, ContactoController.obtener);
router.patch('/:id/leido', verificarToken, soloAdmin, ContactoController.marcarLeido);
router.delete('/:id', verificarToken, soloAdmin, ContactoController.eliminar);

module.exports = router;
