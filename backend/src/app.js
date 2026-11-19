const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('../config/env');
const { CABECERAS } = require('../config/cabeceras');
const { enviarExito, enviarError } = require('../utils/response');
const { contieneClavesProhibidas } = require('../utils/validacion');
const { limiteGeneral } = require('../middlewares/rateLimit.middleware');
const { rutaNoEncontrada, manejarErrores } = require('../middlewares/error.middleware');

const CARPETA_PUBLICA = path.join(config.RAIZ, 'public');
const app = express();

app.disable('x-powered-by');
// Detrás del proxy de Vercel (o de otro balanceador) la IP real viene en X-Forwarded-For.
app.set('trust proxy', process.env.VERCEL ? 1 : Number(process.env.TRUST_PROXY || 0));

/* ---------- Cabeceras de seguridad ---------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // se envía la misma política que en vercel.json (abajo)
    strictTransportSecurity: config.esProduccion ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xFrameOptions: { action: 'deny' },
  })
);
app.use((req, res, next) => {
  const csp = config.esProduccion
    ? CABECERAS['Content-Security-Policy']
    : CABECERAS['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Permissions-Policy', CABECERAS['Permissions-Policy']);
  next();
});

/* ---------- CORS ----------
   El sitio y la API comparten dominio, así que por defecto NO se permite ningún
   otro origen. Para un frontend en otro dominio, define CORS_ORIGIN con la lista. */
const origenes = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
const permitirTodos = origenes.includes('*') && !config.esProduccion;
if (origenes.includes('*') && config.esProduccion) {
  console.warn('[config] CORS_ORIGIN="*" se ignora en producción. Indica los dominios permitidos.');
}
app.use(
  '/api',
  cors({
    origin: permitirTodos ? true : origenes.filter((o) => o !== '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Location', 'RateLimit', 'RateLimit-Policy'],
    credentials: false,
    maxAge: 600,
  })
);

/* ---------- Reglas comunes de la API ---------- */
app.use('/api', limiteGeneral, (req, res, next) => {
  // Las respuestas de la API pueden incluir datos personales: nunca se guardan en caché.
  res.setHeader('Cache-Control', 'no-store');
  // Solo se acepta JSON en las peticiones que envían datos.
  const conCuerpo = ['POST', 'PUT', 'PATCH'].includes(req.method) && Number(req.headers['content-length'] || 0) > 0;
  if (conCuerpo && !req.is('application/json')) {
    return enviarError(res, 415, 'El cuerpo de la petición debe enviarse como application/json');
  }
  return next();
});
app.use('/api', express.json({ limit: '10kb', strict: true }));
app.use('/api', (req, res, next) => {
  if (req.body && contieneClavesProhibidas(req.body)) {
    return enviarError(res, 400, 'El cuerpo de la petición contiene propiedades no permitidas');
  }
  return next();
});

/* ---------- Configuración incompleta: la API no atiende hasta que se corrija ---------- */
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/salud')) return next();
  const problemas = config.problemasDeConfiguracion();
  if (problemas.length > 0) {
    console.error('[config]', problemas.join('. '));
    return enviarError(res, 503, 'El servicio no está disponible por un problema de configuración del servidor');
  }
  return next();
});

app.get('/api', (req, res) =>
  enviarExito(res, {
    message: '¡API de Café Hondureño funcionando!',
    data: { documentacion: 'Ver docs/API.md', salud: '/api/salud' },
  })
);
for (const [prefijo, router] of require('../routes')) app.use(prefijo, router);
app.use('/api', rutaNoEncontrada);

/* ---------- Sitio estático (solo en local; en Vercel lo sirve la CDN) ---------- */
if (!process.env.VERCEL) {
  app.use(
    express.static(CARPETA_PUBLICA, {
      extensions: ['html'],
      index: 'index.html',
      dotfiles: 'ignore',
      setHeaders(res, ruta) {
        if (ruta.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );
  app.use((req, res) => res.status(404).sendFile(path.join(CARPETA_PUBLICA, '404.html')));
}

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
