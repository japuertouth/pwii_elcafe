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
      // Moderación: las curiosidades de usuarios normales quedan pendientes (false) hasta que un admin las apruebe.
      aprobada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  /* ---------- Detección de la columna "aprobada" ----------
     Si la base de Azure todavía no tiene la columna (falta correr docs/sql/001_moderacion_curiosidades.sql),
     la API sigue funcionando sin moderación en lugar de fallar. Se vuelve a revisar cada 10 minutos. */
  let cache = { valor: null, hasta: 0 };
  Curiosidad.moderacionActiva = async function () {
    if (cache.valor !== null && (cache.valor || Date.now() < cache.hasta)) return cache.valor;
    try {
      const columnas = await sequelize.getQueryInterface().describeTable(Curiosidad.getTableName());
      const existe = Object.keys(columnas).some((c) => c.toLowerCase() === 'aprobada');
      if (!existe) console.warn('[moderación] Falta la columna curiosidades.aprobada: ejecuta docs/sql/001_moderacion_curiosidades.sql');
      cache = { valor: existe, hasta: Date.now() + 10 * 60 * 1000 };
    } catch (error) {
      console.error('[moderación] No se pudo revisar la tabla curiosidades:', error.message);
      throw error;
    }
    return cache.valor;
  };

  async function opciones() {
    const activa = await Curiosidad.moderacionActiva();
    return { activa, attributes: activa ? undefined : { exclude: ['aprobada'] } };
  }

  Curiosidad.listar = async function ({ categoriaId, regionId, categoriaNombre, texto, page, limit, estado = 'aprobadas' }) {
    const { activa, attributes } = await opciones();
    const where = {};
    if (categoriaId) where.categoria_id = categoriaId;
    if (regionId) where.region_id = regionId;
    if (activa && estado === 'aprobadas') where.aprobada = true;
    if (estado === 'pendientes') {
      if (!activa) return { count: 0, rows: [] };
      where.aprobada = false;
    }
    if (texto) {
      const patron = `%${escaparLike(texto)}%`;
      where[Op.or] = [{ titulo: { [Op.like]: patron } }, { descripcion: { [Op.like]: patron } }];
    }

    return Curiosidad.findAndCountAll({
      where,
      attributes,
      include: relaciones(categoriaNombre),
      order: [
        ['creado_en', estado === 'pendientes' ? 'ASC' : 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });
  };

  Curiosidad.obtenerPorId = async function (id) {
    const { attributes } = await opciones();
    return Curiosidad.findByPk(id, { attributes, include: relaciones() });
  };

  Curiosidad.obtenerAleatoria = async function ({ excluirId, categoriaId } = {}) {
    const { activa, attributes } = await opciones();
    const where = {};
    if (excluirId) where.id = { [Op.ne]: excluirId };
    if (categoriaId) where.categoria_id = categoriaId;
    if (activa) where.aprobada = true;

    return Curiosidad.findOne({
      where,
      attributes,
      include: relaciones(),
      order: sequelize.getDialect() === 'mssql' ? sequelize.literal('NEWID()') : sequelize.random(),
    });
  };

  function sinModeracion(datos, activa) {
    if (activa) return datos;
    const { aprobada, ...resto } = datos;
    return resto;
  }

  Curiosidad.crearYObtener = async function (datos) {
    const { activa } = await opciones();
    const valores = sinModeracion(datos, activa);
    const nueva = await Curiosidad.create(valores, { fields: Object.keys(valores) });
    return Curiosidad.obtenerPorId(nueva.id);
  };

  Curiosidad.actualizarYObtener = async function (instancia, datos) {
    const { activa } = await opciones();
    const valores = sinModeracion(datos, activa);
    await instancia.update(valores, { fields: Object.keys(valores) });
    return Curiosidad.obtenerPorId(instancia.id);
  };

  Curiosidad.eliminar = async function (instancia) {
    await instancia.destroy();
  };

  return Curiosidad;
};
