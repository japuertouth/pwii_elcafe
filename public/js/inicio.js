/* Café Hondureño · página de inicio */
(function () {
  'use strict';

  /* ---------- Saludo según la hora ---------- */
  var hora = new Date().getHours();
  var saludo = 'Buenas noches. ¿Un descafeinado antes de dormir?';
  if (hora >= 5 && hora < 12) saludo = 'Buenos días. La hora perfecta para un buen café.';
  else if (hora >= 12 && hora < 19) saludo = 'Buenas tardes. ¿Qué tal un cafecito con pan?';
  document.getElementById('saludo').textContent = saludo;

  /* ---------- Taza interactiva ---------- */
  var taza = document.getElementById('taza');
  var liquido = document.getElementById('liquido');
  var humo = document.getElementById('humo');
  var mensajeTaza = document.getElementById('mensajeTaza');
  var sorbos = 0;
  var mensajes = ['Mmm, delicioso.', 'Notas a chocolate y caramelo…', 'Se acabó. Toca de nuevo para servir otra.'];
  taza.addEventListener('click', function () {
    if (liquido.classList.contains('vacia')) {
      liquido.classList.remove('vacia');
      liquido.style.top = '';
      humo.classList.remove('apagado');
      mensajeTaza.textContent = 'Taza recién servida.';
      taza.setAttribute('aria-label', 'Taza de café: toca para dar un sorbo');
      sorbos = 0;
      return;
    }
    sorbos += 1;
    taza.classList.remove('sorbo');
    void taza.offsetWidth;
    taza.classList.add('sorbo');
    liquido.style.top = 14 + sorbos * 40 + 'px';
    mensajeTaza.textContent = mensajes[Math.min(sorbos - 1, mensajes.length - 1)];
    if (sorbos >= 3) {
      liquido.style.top = '';
      liquido.classList.add('vacia');
      humo.classList.add('apagado');
      taza.setAttribute('aria-label', 'Taza vacía: toca para servir otra');
    }
  });

  /* ---------- Leer más ---------- */
  var botonMas = document.getElementById('botonMas');
  var extra = document.getElementById('sobreExtra');
  botonMas.addEventListener('click', function () {
    extra.hidden = !extra.hidden;
    botonMas.setAttribute('aria-expanded', String(!extra.hidden));
    botonMas.textContent = extra.hidden ? 'Leer más' : 'Leer menos';
  });

  /* ---------- Regiones (API con respaldo local) ---------- */
  var REGIONES_LOCALES = [
    { nombre: 'Copán', departamentos: 'Copán, Ocotepeque, Cortés y Santa Bárbara', altitud: '1,000–1,700 msnm',
      descripcion: 'En el occidente del país, cerca de la frontera con Guatemala y de las ruinas mayas de Copán. Es una de las regiones más productivas de Honduras.',
      notas: ['Chocolate', 'Caramelo', 'Dulce', 'Cuerpo cremoso'] },
    { nombre: 'Opalaca', departamentos: 'Santa Bárbara, Intibucá y Lempira', altitud: '1,100–1,500 msnm',
      descripcion: 'Toma su nombre de la sierra de Opalaca. Sus cafés destacan por una acidez delicada y aromas frutales.',
      notas: ['Frutas tropicales', 'Uva', 'Acidez delicada'] },
    { nombre: 'Montecillos', departamentos: 'La Paz, Comayagua, Intibucá y Santa Bárbara', altitud: '1,200–1,600 msnm',
      descripcion: 'Aquí está Marcala, cuyo café fue el primero de Centroamérica en obtener Denominación de Origen. Zonas altas y frescas.',
      notas: ['Durazno', 'Naranja', 'Acidez brillante', 'Cuerpo sedoso'] },
    { nombre: 'Comayagua', departamentos: 'Comayagua y zonas de La Paz y Francisco Morazán', altitud: '1,100–1,500 msnm',
      descripcion: 'En el centro del país, a unos 80 km de Tegucigalpa. Produce cafés frutales con fragancias dulces y acidez viva.',
      notas: ['Cítricos', 'Frutal', 'Chocolate', 'Cuerpo aterciopelado'] },
    { nombre: 'El Paraíso', departamentos: 'El Paraíso, Choluteca y parte de Francisco Morazán', altitud: '1,000–1,400 msnm',
      descripcion: 'Al oriente, cerca de la frontera con Nicaragua. Una de las regiones con mayor volumen de producción del país.',
      notas: ['Cítrico', 'Dulce', 'Floral', 'Suave'] },
    { nombre: 'Agalta', departamentos: 'Olancho, Yoro y Colón', altitud: '1,000–1,400 msnm',
      descripcion: 'Rodeada de bosques nublados como la Sierra de Agalta, en el nororiente. Cafés de cuerpo medio y notas tropicales.',
      notas: ['Frutas tropicales', 'Caramelo', 'Chocolate'] },
  ];

  var lista = document.getElementById('listaRegiones');
  var detalle = document.getElementById('detalleRegion');
  var regiones = REGIONES_LOCALES;

  function crear(etiqueta, texto, clase) {
    var el = document.createElement(etiqueta);
    if (texto !== undefined) el.textContent = texto;
    if (clase) el.className = clase;
    return el;
  }

  function mostrarRegion(indice) {
    var r = regiones[indice];
    lista.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === indice)); });
    detalle.replaceChildren();
    detalle.appendChild(crear('h3', r.nombre));
    if (r.descripcion) detalle.appendChild(crear('p', r.descripcion));
    if (r.notas && r.notas.length) {
      var notas = crear('ul', undefined, 'notas');
      notas.setAttribute('aria-label', 'Notas de sabor');
      r.notas.forEach(function (n) { notas.appendChild(crear('li', n, 'etiqueta-dato')); });
      detalle.appendChild(notas);
    }
    var datos = crear('dl', undefined, 'region__datos');
    [['Departamentos', r.departamentos], ['Altura', r.altitud], ['Región', (indice + 1) + ' de ' + regiones.length]].forEach(function (par) {
      if (!par[1]) return;
      var caja = document.createElement('div');
      caja.appendChild(crear('dt', par[0]));
      caja.appendChild(crear('dd', par[1]));
      datos.appendChild(caja);
    });
    detalle.appendChild(datos);
  }

  function pintarRegiones() {
    lista.replaceChildren();
    regiones.forEach(function (r, i) {
      var li = document.createElement('li');
      var b = crear('button', r.nombre);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { mostrarRegion(i); });
      li.appendChild(b);
      lista.appendChild(li);
    });
    mostrarRegion(0);
  }

  pintarRegiones();

  // Si la API está disponible, se usan los datos de la base (el contenido local queda de respaldo).
  if (window.Cafe) {
    window.Cafe.api('/regiones', { autenticar: false }).then(function (r) {
      var desdeApi = (r.data || []).filter(function (x) { return x && x.nombre; }).map(function (x) {
        var local = REGIONES_LOCALES.find(function (l) { return l.nombre.toLowerCase() === String(x.nombre).toLowerCase(); }) || {};
        return {
          nombre: x.nombre,
          departamentos: x.departamentos || local.departamentos,
          altitud: x.altitud || local.altitud,
          descripcion: x.descripcion || local.descripcion,
          notas: x.perfil_taza ? String(x.perfil_taza).split(/[,;]/).map(function (s) { return s.trim(); }).filter(Boolean) : local.notas,
        };
      });
      if (desdeApi.length >= 3) { regiones = desdeApi; pintarRegiones(); }
    }).catch(function () { /* se quedan los datos locales */ });
  }

  /* ---------- Calculadora ---------- */
  var rango = document.getElementById('rangoTazas');
  var ML_POR_TAZA = 240;
  function calcular() {
    var tazas = Number(rango.value);
    var proporcion = Number(document.querySelector('input[name="intensidad"]:checked').value);
    var agua = tazas * ML_POR_TAZA;
    document.getElementById('numTazas').textContent = tazas;
    document.getElementById('mililitros').textContent = agua.toLocaleString('es-HN');
    document.getElementById('gramos').textContent = Math.round(agua / proporcion);
  }
  document.getElementById('calculadora').addEventListener('input', calcular);
  document.getElementById('calculadora').addEventListener('submit', function (e) { e.preventDefault(); });
  calcular();

  /* ---------- Dato curioso (API con respaldo local) ---------- */
  var DATOS = [
    'Honduras es el mayor productor de café de Centroamérica y el quinto del mundo.',
    'En la cosecha 2025-2026 Honduras exportó 7.3 millones de quintales: un récord histórico.',
    'El café dejó US$2,285 millones en divisas en la cosecha 2025-2026, la cifra más alta registrada.',
    'Casi 97,000 productores de café están registrados en el Instituto Hondureño del Café.',
    'La cosecha 2025-2026 se vendió a 53 países.',
    'El café de Marcala fue el primero de Centroamérica con Denominación de Origen.',
    'La cosecha cafetalera inicia cada 1 de octubre, Día Nacional de la Caficultura.',
    'Para la cosecha 2026-2027 el Ihcafé pronostica exportar unos 7 millones de quintales.',
  ];
  var texto = document.getElementById('textoDato');
  var ultimo = 0;
  function cambiarDato(nuevo) {
    texto.classList.add('cambiando');
    setTimeout(function () { texto.textContent = nuevo; texto.classList.remove('cambiando'); }, 200);
  }
  document.getElementById('botonDato').addEventListener('click', function () {
    window.Cafe.api('/curiosidades/aleatoria', { autenticar: false, tiempo: 4000 })
      .then(function (r) { cambiarDato(r.data.descripcion || r.data.titulo); })
      .catch(function () {
        var i;
        do { i = Math.floor(Math.random() * DATOS.length); } while (i === ultimo);
        ultimo = i;
        cambiarDato(DATOS[i]);
      });
  });
})();
