const bcrypt = require('bcryptjs');
const config = require('../config/env');
const Reglas = require('../utils/reglas');
const { sequelize, Usuario } = require('../models');

const correo = String(process.argv[2] || '').trim().toLowerCase();
const nueva = String(process.argv[3] || '');

function validar() {
  if (!correo || !nueva) return 'Uso: npm run restablecer:password -- correo@ejemplo.com "Nueva#Clave2026"';
  return null;
}

async function principal() {
  const error = validar();
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  await sequelize.authenticate();
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
    console.error(`No existe un usuario con el correo ${correo}.`);
    process.exitCode = 1;
    return;
  }
  const errores = Reglas.erroresPassword(nueva, { nombre: usuario.nombre, correo: usuario.correo });
  if (errores.length > 0) {
    console.error(`La contraseña no cumple: ${errores.join('; ')}.`);
    process.exitCode = 1;
    return;
  }
  const password_hash = await bcrypt.hash(nueva.normalize('NFC'), config.bcryptCosto);
  await usuario.update({ password_hash, activo: true });
  console.log(`Contraseña actualizada para ${usuario.nombre} (${correo}). Rol: ${usuario.rol_id}. Ya puede iniciar sesión con la nueva contraseña.`);
}

principal()
  .catch((error) => {
    console.error('Error:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
