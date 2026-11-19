module.exports = (sequelize, DataTypes) => {
  const MensajeContacto = sequelize.define(
    'MensajeContacto',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.STRING(100), allowNull: false },
      correo: { type: DataTypes.STRING(150), allowNull: false },
      asunto: { type: DataTypes.STRING(20), allowNull: false },
      mensaje: { type: DataTypes.STRING(1000), allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      leido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'mensajes_contacto',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: false,
    }
  );

  MensajeContacto.associate = (models) => {
    MensajeContacto.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  };

  return MensajeContacto;
};
