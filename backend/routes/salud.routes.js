const { Router } = require('express');
const { enviarExito, enviarError } = require('../utils/response');

const router = Router();

router.get('/', async (req, res) => {
  const { sequelize } = require('../models');
  try {
    await sequelize.authenticate();
    return enviarExito(res, { message: 'API funcionando', data: { api: 'ok', baseDeDatos: 'ok' } });
  } catch {
    return enviarError(res, 503, 'La API responde, pero no hay conexión con la base de datos');
  }
});

module.exports = router;
