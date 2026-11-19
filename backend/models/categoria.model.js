module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define(
    'Categoria',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(60), allowNull: false },
      tipo: { type: DataTypes.STRING(15), allowNull: false },
    },
    { tableName: 'categorias' }
  );

  return Categoria;
};
