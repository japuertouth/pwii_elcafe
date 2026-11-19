const { MensajeContacto, Usuario } = require('../models');
const AppError = require('../utils/AppError');
const Correo = require('./correo.service');
const { leerId, leerPaginacion, metaPaginacion, leerBooleanoQuery, Validador } = require('../utils/validacion');

const ASUNTOS = ['informacion', 'productos', 'sugerencia', 'otro'];
const MAX_ENLACES = 2;
const relaciones = [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'correo'] }];

async function buscarOFallar(id) {
  const mensaje = await MensajeContacto.findByPk(id, { include: relaciones });
  if (!mensaje) throw new AppError('Mensaje no encontrado', 404);
  return mensaje;
}

const NOMBRES_ASUNTO = { informacion: 'Información sobre el café', productos: 'Productos', sugerencia: 'Sugerencia', otro: 'Otro motivo' };

/** Avisa por correo al equipo (CORREO_AVISOS) cuando llega un mensaje. Si falla, el mensaje igual queda guardado. */
async function avisarAlEquipo(datos) {
  const destino = process.env.CORREO_AVISOS;
  if (!destino || !Correo.configurado()) return;
  try {
    await Correo.enviar({
      para: destino,
      responderA: datos.correo,
      asunto: `Nuevo mensaje de contacto: ${NOMBRES_ASUNTO[datos.asunto] || datos.asunto}`,
      texto:
        `Nombre: ${datos.nombre}\nCorreo: ${datos.correo}\nMotivo: ${NOMBRES_ASUNTO[datos.asunto] || datos.asunto}\n\n` +
        `${datos.mensaje}\n\n` +
        `Responde a este correo para contestarle directamente, o revisa todos los mensajes en ${Correo.urlSitio()}/admin\n`,
    });
  } catch (error) {
    console.error('[correo] No se pudo enviar el aviso de contacto:', error.message);
  }
}

class ContactoService {
  static async crear(body, usuario) {
    const v = new Validador(body)
      .nombrePersona('nombre', { obligatorio: true })
      .correo('correo', { obligatorio: true })
      .opcion('asunto', ASUNTOS, { obligatorio: true, etiqueta: 'El asunto' })
      .texto('mensaje', { obligatorio: true, min: 10, max: 1000, etiqueta: 'El mensaje', multilinea: true });
    if (v.datos.mensaje && (v.datos.mensaje.match(/https?:\/\/|www\./gi) || []).length > MAX_ENLACES) {
      v.error('mensaje', `El mensaje no puede incluir más de ${MAX_ENLACES} enlaces`);
    }
    const datos = v.resultado();

    // Campo trampa ("honeypot"): las personas no lo ven; si llega con texto es un robot.
    // Se responde como si todo estuviera bien, pero no se guarda nada.
    if (typeof body.sitio_web === 'string' && body.sitio_web.trim() !== '') {
      return { recibido: true };
    }

    const nuevo = await MensajeContacto.create({ ...datos, usuario_id: usuario ? usuario.id : null, leido: false });
    await avisarAlEquipo(datos);
    return (await buscarOFallar(nuevo.id)).toJSON();
  }

  static async listar(query = {}) {
    const paginacion = leerPaginacion(query);
    const where = {};
    const leido = leerBooleanoQuery(query.leido, 'leido');
    if (leido !== undefined) where.leido = leido;
    if (query.asunto !== undefined) {
      const asunto = String(query.asunto).trim().toLowerCase();
      if (!ASUNTOS.includes(asunto)) throw new AppError(`El parámetro "asunto" debe ser uno de: ${ASUNTOS.join(', ')}`, 400);
      where.asunto = asunto;
    }

    const [{ count, rows }, sinLeer] = await Promise.all([
      MensajeContacto.findAndCountAll({
        where,
        include: relaciones,
        order: [['creado_en', 'DESC'], ['id', 'DESC']],
        limit: paginacion.limit,
        offset: paginacion.offset,
        distinct: true,
      }),
      MensajeContacto.count({ where: { leido: false } }),
    ]);
    return { items: rows.map((m) => m.toJSON()), meta: { ...metaPaginacion(count, paginacion), sinLeer } };
  }

  static async obtener(idCrudo) {
    return (await buscarOFallar(leerId(idCrudo))).toJSON();
  }

  static async marcarLeido(idCrudo, body = {}) {
    const id = leerId(idCrudo);
    const { leido = true } = new Validador(body || {}, { parcial: true }).booleano('leido').resultado();
    const mensaje = await buscarOFallar(id);
    await mensaje.update({ leido });
    return (await buscarOFallar(id)).toJSON();
  }

  static async eliminar(idCrudo) {
    const id = leerId(idCrudo);
    const mensaje = await buscarOFallar(id);
    await mensaje.destroy();
    return { id };
  }
}

module.exports = ContactoService;
