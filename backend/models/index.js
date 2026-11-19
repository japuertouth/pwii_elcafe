const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const modelos = {
  Rol: require('./rol.model')(sequelize, DataTypes),
  Usuario: require('./usuario.model')(sequelize, DataTypes),
  Categoria: require('./categoria.model')(sequelize, DataTypes),
  Region: require('./region.model')(sequelize, DataTypes),
  Curiosidad: require('./curiosidad.model')(sequelize, DataTypes),
  Galeria: require('./galeria.model')(sequelize, DataTypes),
  MensajeContacto: require('./mensajeContacto.model')(sequelize, DataTypes),
};

Object.values(modelos).forEach((modelo) => {
  if (typeof modelo.associate === 'function') modelo.associate(modelos);
});

module.exports = { sequelize, ...modelos };
