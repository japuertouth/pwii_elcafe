/* Envío de correos por SMTP con la cuenta de correo del equipo (Gmail, Outlook, correo institucional...).
   No usa servicios externos adicionales: solo las variables SMTP_* del archivo .env o de Vercel. */
const nodemailer = require('nodemailer');

const enviadosEnMemoria = [];
let transporte = null;

function modoMemoria() {
  return process.env.CORREO_TRANSPORTE === 'memoria';
}

function configurado() {
  return modoMemoria() || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
  if (transporte) return transporte;
  if (modoMemoria()) {
    transporte = nodemailer.createTransport({ jsonTransport: true });
  } else {
    const puerto = Number(process.env.SMTP_PORT) || 587;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      requireTLS: puerto !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporte;
}

/** Envía un correo de solo texto (sin HTML, para no permitir inyección de contenido). */
async function enviar({ para, asunto, texto, responderA }) {
  if (!configurado()) throw new Error('El envío de correos no está configurado (faltan SMTP_HOST, SMTP_USER o SMTP_PASS)');
  const remitente = process.env.CORREO_REMITENTE || process.env.SMTP_USER || 'no-responder@cafehondureno.local';
  const mensaje = {
    from: { name: 'Café Hondureño', address: remitente },
    to: para,
    subject: String(asunto).replace(/[\r\n]+/g, ' ').slice(0, 200),
    text: texto,
    replyTo: responderA || undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
  const resultado = await obtenerTransporte().sendMail(mensaje);
  if (modoMemoria()) enviadosEnMemoria.push({ para, asunto: mensaje.subject, texto, responderA });
  return resultado;
}

/** Dirección pública del sitio para armar enlaces en los correos (nunca se toma de la petición). */
function urlSitio() {
  if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://localhost:${Number(process.env.PORT) || 4000}`;
}

module.exports = { configurado, enviar, urlSitio, _enviados: enviadosEnMemoria };
