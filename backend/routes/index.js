module.exports = [
  ['/api/salud', require('./salud.routes')],
  ['/api/auth', require('./auth.routes')],
  ['/api/usuarios', require('./usuarios.routes')],
  ['/api/categorias', require('./categorias.routes')],
  ['/api/regiones', require('./regiones.routes')],
  ['/api/curiosidades', require('./curiosidades.routes')],
  ['/api/galeria', require('./galeria.routes')],
  ['/api/contacto', require('./contacto.routes')],
];
