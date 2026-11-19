/* Verifica que la configuración de despliegue y las páginas cumplan las reglas de seguridad. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { CABECERAS } = require('../config/cabeceras');

const RAIZ = path.join(__dirname, '..', '..');
const PUBLICA = path.join(RAIZ, 'public');
const vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const paginas = fs.readdirSync(PUBLICA).filter((f) => f.endsWith('.html'));

test('vercel.json envía las mismas cabeceras de seguridad que Express', () => {
  const globales = vercel.headers.find((h) => h.source === '/(.*)').headers;
  for (const [clave, valor] of Object.entries(CABECERAS)) {
    assert.equal(globales.find((h) => h.key === clave)?.value, valor, `cabecera ${clave}`);
  }
});

test('vercel.json dirige /api/* a la función y publica la carpeta public', () => {
  assert.equal(vercel.outputDirectory, 'public');
  assert.ok(vercel.rewrites.some((r) => r.source.startsWith('/api/') && r.destination === '/api'));
  assert.ok(fs.existsSync(path.join(RAIZ, 'api', 'index.js')));
});

test('Las páginas no usan scripts ni estilos en línea (compatibles con la CSP estricta)', () => {
  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(PUBLICA, pagina), 'utf8');
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, `${pagina}: <script> en línea`);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${pagina}: manejador de eventos en línea`);
    assert.doesNotMatch(html, /<style[\s>]/i, `${pagina}: <style> en línea`);
    assert.doesNotMatch(html, /\sstyle\s*=/i, `${pagina}: atributo style`);
  }
});

test('Todos los enlaces y recursos internos de las páginas existen', () => {
  const existe = (ruta) => {
    const limpia = decodeURIComponent(ruta.split(/[?#]/)[0]);
    if (limpia === '/' || limpia === '') return true;
    const archivo = path.join(PUBLICA, limpia);
    return fs.existsSync(archivo) || fs.existsSync(`${archivo}.html`);
  };
  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(PUBLICA, pagina), 'utf8');
    for (const [, ruta] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      assert.ok(existe(ruta), `${pagina}: no existe ${ruta}`);
    }
  }
});

test('Los enlaces externos que abren otra pestaña usan rel="noopener noreferrer"', () => {
  for (const pagina of paginas) {
    const html = fs.readFileSync(path.join(PUBLICA, pagina), 'utf8');
    for (const [etiqueta] of html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
      assert.match(etiqueta, /rel="noopener noreferrer"/, `${pagina}: ${etiqueta}`);
    }
  }
});
