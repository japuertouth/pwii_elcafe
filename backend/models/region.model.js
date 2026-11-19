module.exports = (sequelize, DataTypes) => {
  const Region = sequelize.define(
    'Region',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      departamentos: { type: DataTypes.STRING(150), allowNull: true },
      altitud: { type: DataTypes.STRING(40), allowNull: true },
      perfil_taza: { type: DataTypes.STRING(200), allowNull: true },
      descripcion: { type: DataTypes.STRING(600), allowNull: true },
      imagen_url: { type: DataTypes.STRING(300), allowNull: true },
    },
    { tableName: 'regiones' }
  );

  return Region;
};
