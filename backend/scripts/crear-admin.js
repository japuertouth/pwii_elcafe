const { Usuario } = require('../models');

const correo = String(process.argv[2] || '').trim().toLowerCase();
const ADMIN_ROL_ID = Number(process.env.ADMIN_ROL_ID || 1);

(async () => {
  if (!correo) {
    console.error('Indica el correo:  npm run crear:admin -- correo@ejemplo.com');
    process.exit(1);
  }
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
    console.error(`No existe un usuario con el correo ${correo}. Regístralo primero con POST /api/auth/registro.`);
    process.exit(1);
  }
  await usuario.update({ rol_id: ADMIN_ROL_ID, activo: true });
  console.log(`Listo: ${usuario.nombre} (${correo}) ahora es administrador (rol_id = ${ADMIN_ROL_ID}).`);
  console.log('Inicia sesión de nuevo para obtener un token con el rol actualizado.');
  process.exit(0);
})().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
