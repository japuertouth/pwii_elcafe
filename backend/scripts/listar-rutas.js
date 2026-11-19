for (const k of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) process.env[k] = process.env[k] || 'sin-conexion';

function listarRutas() {
  const tabla = require('../routes');
  const rutas = [];
  for (const [prefijo, router] of tabla) {
    for (const capa of router.stack) {
      if (!capa.route) continue;
      const privada = capa.route.stack.some((s) => s.name === 'verificarToken');
      const soloAdmin = capa.route.stack.some((s) => s.name === 'soloAdmin');
      for (const metodo of Object.keys(capa.route.methods)) {
        rutas.push({ metodo: metodo.toUpperCase(), ruta: prefijo + (capa.route.path === '/' ? '' : capa.route.path), privada, soloAdmin });
      }
    }
  }
  return rutas;
}

if (require.main === module) {
  const rutas = listarRutas();
  const privadas = rutas.filter((r) => r.privada).length;
  console.log('');
  for (const r of rutas) {
    const acceso = r.soloAdmin ? '🔒 admin   ' : r.privada ? '🔒 privada ' : '   pública ';
    console.log(`${acceso}  ${r.metodo.padEnd(6)} ${r.ruta}`);
  }
  console.log(`\nRutas privadas: ${privadas} de ${rutas.length} (${Math.round((privadas / rutas.length) * 100)} %).`);
}

module.exports = { listarRutas };
