module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'El nombre es obligatorio' },
          len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' },
        },
      },

      correo: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'El correo no tiene un formato válido' },
          len: { args: [5, 150], msg: 'El correo no puede superar 150 caracteres' },
        },
      },

      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          is: {
            args: [/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/],
            msg: 'password_hash debe ser un hash bcrypt, no la contraseña en texto plano',
          },
        },
      },

      rol_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        validate: { isInt: { msg: 'rol_id debe ser un entero' }, min: { args: [1], msg: 'rol_id inválido' } },
      },

      activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'usuarios',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  Usuario.associate = (models) => {
    Usuario.belongsTo(models.Rol, { foreignKey: 'rol_id', as: 'rol' });
  };

  return Usuario;
};
