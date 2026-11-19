module.exports = (sequelize, DataTypes) => {
  const Galeria = sequelize.define(
    'Galeria',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      titulo: { type: DataTypes.STRING(120), allowNull: false },
      descripcion: { type: DataTypes.STRING(400), allowNull: true },
      imagen_url: { type: DataTypes.STRING(300), allowNull: false },
      categoria_id: { type: DataTypes.INTEGER, allowNull: false },
      region_id: { type: DataTypes.INTEGER, allowNull: true },
      subido_por: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'galeria',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  Galeria.associate = (models) => {
    Galeria.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
    Galeria.belongsTo(models.Region, { foreignKey: 'region_id', as: 'region' });
    Galeria.belongsTo(models.Usuario, { foreignKey: 'subido_por', as: 'autor' });
  };

  return Galeria;
};
