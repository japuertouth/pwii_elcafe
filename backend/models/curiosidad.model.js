const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Curiosidad = sequelize.define(
    'Curiosidad',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      titulo: { type: DataTypes.STRING(150), allowNull: false },
      descripcion: { type: DataTypes.STRING(1000), allowNull: false },
      categoria_id: { type: DataTypes.INTEGER, allowNull: false },
      region_id: { type: DataTypes.INTEGER, allowNull: true },
      creado_por: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'curiosidades',
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
    }
  );

  Curiosidad.associate = (models) => {
    Curiosidad.belongsTo(models.Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
    Curiosidad.belongsTo(models.Region, { foreignKey: 'region_id', as: 'region' });
    Curiosidad.belongsTo(models.Usuario, { foreignKey: 'creado_por', as: 'autor' });
  };

  function relaciones(categoriaNombre) {
    const { Categoria, Region, Usuario } = sequelize.models;
    const incluirCategoria = { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'tipo'] };
    if (categoriaNombre) {
      incluirCategoria.where = { nombre: categoriaNombre };
      incluirCategoria.required = true;
    }
    return [
      incluirCategoria,
      { model: Region, as: 'region', attributes: ['id', 'nombre'] },
      { model: Usuario, as: 'autor', attributes: ['id', 'nombre'] },
    ];
  }

  const escaparLike = (texto) => texto.replace(/[%_[]/g, '[$&]');

  Curiosidad.listar = async function ({ categoriaId, regionId, categoriaNombre, texto, page, limit }) {
    const where = {};
    if (categoriaId) where.categoria_id = categoriaId;
    if (regionId) where.region_id = regionId;
    if (texto) {
      const patron = `%${escaparLike(texto)}%`;
      where[Op.or] = [{ titulo: { [Op.like]: patron } }, { descripcion: { [Op.like]: patron } }];
    }

    return Curiosidad.findAndCountAll({
      where,
      include: relaciones(categoriaNombre),
      order: [
        ['creado_en', 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });
  };

  Curiosidad.obtenerPorId = async function (id) {
    return Curiosidad.findByPk(id, { include: relaciones() });
  };

  Curiosidad.obtenerAleatoria = async function ({ excluirId, categoriaId } = {}) {
    const where = {};
    if (excluirId) where.id = { [Op.ne]: excluirId };
    if (categoriaId) where.categoria_id = categoriaId;

    return Curiosidad.findOne({
      where,
      include: relaciones(),
      order: sequelize.literal('NEWID()'),
    });
  };

  Curiosidad.crearYObtener = async function (datos) {
    const nueva = await Curiosidad.create(datos);
    return Curiosidad.obtenerPorId(nueva.id);
  };

  Curiosidad.actualizarYObtener = async function (instancia, datos) {
    await instancia.update(datos);
    return Curiosidad.obtenerPorId(instancia.id);
  };

  Curiosidad.eliminar = async function (instancia) {
    await instancia.destroy();
  };

  return Curiosidad;
};
