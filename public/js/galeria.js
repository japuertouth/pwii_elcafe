/* Café Hondureño · galería con filtros y visor accesible */
(function () {
  'use strict';

  var TEMAS = { regiones: 'Regiones', cultivo: 'Cultivo y cosecha', granos: 'Granos', cultura: 'Cultura' };
  var FOTOS_LOCALES = [
    { src: '/imagenes/extra/cultivo-cafe.jpg', tema: 'cultivo', titulo: 'Cafetal en flor y fruto', descripcion: 'Planta de café cultivada bajo sombra, como en la mayoría de fincas hondureñas.' },
    { src: '/imagenes/cerezas-cafe.jpg', tema: 'cultivo', titulo: 'Cerezas en distintos grados de madurez', descripcion: 'El corte se hace a mano y solo se cosechan las cerezas rojas, ya maduras.' },
    { src: '/imagenes/seleccion-granos.jpg', tema: 'cultivo', titulo: 'Secado y selección del grano', descripcion: 'Productores hondureños revisan el grano para separar los defectos antes de venderlo.' },
    { src: '/imagenes/cereza-arabica.jpg', tema: 'granos', titulo: 'Cereza de café arábica', descripcion: 'Dentro de cada cereza hay, normalmente, dos semillas: los granos de café.' },
    { src: '/imagenes/cafe-tostado.jpg', tema: 'granos', titulo: 'Café tostado', descripcion: 'El tueste transforma el grano verde y despierta aromas a caramelo, chocolate y frutas.' },
    { src: '/imagenes/tamal-y-cafe.jpg', tema: 'cultura', titulo: 'Tamal con cafecito', descripcion: 'Una combinación clásica de la mesa hondureña, sobre todo en días de fiesta.' },
    { src: '/imagenes/extra/copan-honduras.jpg', tema: 'regiones', titulo: 'Copán, café y ruinas mayas', descripcion: 'La región cafetalera de Copán, en el occidente del país, rodea el famoso sitio maya.' },
  ];

  var fotos = FOTOS_LOCALES.slice();
  var filtro = 'todas';
  var visibles = [];
  var actual = 0;
  var galeria = document.getElementById('galeria');
  var filtros = document.getElementById('filtrosGaleria');
  var resumen = document.getElementById('resumenGaleria');
  var visor = document.getElementById('visor');

  function slug(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /** Solo se aceptan imágenes del propio sitio o por https (nunca javascript: ni data:). */
  function urlSegura(url) {
    url = String(url || '').trim();
    if (/^https:\/\//i.test(url)) return url;
    if (/^\/?[\w./-]+$/.test(url) && url.indexOf('..') === -1) return url.charAt(0) === '/' ? url : '/' + url;
    return null;
  }

  function pintarFiltros() {
    filtros.replaceChildren();
    var opciones = [['todas', 'Todas']].concat(Object.keys(TEMAS).map(function (k) { return [k, TEMAS[k]]; }));
    opciones.forEach(function (op) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = op[1];
      b.setAttribute('aria-pressed', String(op[0] === filtro));
      b.addEventListener('click', function () { filtro = op[0]; pintarFiltros(); pintar(); });
      filtros.appendChild(b);
    });
  }

  function pintar() {
    visibles = fotos.filter(function (f) { return filtro === 'todas' || f.tema === filtro; });
    galeria.replaceChildren();
    if (visibles.length === 0) {
      var vacio = document.createElement('p');
      vacio.className = 'vacio';
      vacio.textContent = 'Todavía no hay fotos de este tema.';
      galeria.appendChild(vacio);
    }
    visibles.forEach(function (f, i) {
      var figura = document.createElement('figure');
      figura.className = 'galeria__item';
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'galeria__boton';
      boton.setAttribute('aria-label', 'Ver en grande: ' + f.titulo);
      var img = document.createElement('img');
      img.src = f.src;
      img.alt = f.titulo;
      img.loading = 'lazy';
      img.decoding = 'async';
      boton.appendChild(img);
      boton.addEventListener('click', function () { abrir(i); });
      var pie = document.createElement('figcaption');
      var h3 = document.createElement('h3');
      h3.textContent = f.titulo;
      var p = document.createElement('p');
      p.textContent = TEMAS[f.tema] || f.temaNombre || '';
      pie.appendChild(h3);
      pie.appendChild(p);
      figura.appendChild(boton);
      figura.appendChild(pie);
      galeria.appendChild(figura);
    });
    resumen.textContent = visibles.length + (visibles.length === 1 ? ' foto' : ' fotos');
    document.getElementById('totalFotos').textContent = fotos.length;
  }

  /* ---------- Visor ---------- */
  function mostrar(i) {
    actual = (i + visibles.length) % visibles.length;
    var f = visibles[actual];
    var visorImagen = document.getElementById('visorImagen');
    visorImagen.alt = f.titulo;
    visorImagen.src = f.src;
    document.getElementById('visorTitulo').textContent = f.titulo;
    document.getElementById('visorDescripcion').textContent = f.descripcion || '';
    document.getElementById('visorTema').textContent = TEMAS[f.tema] || f.temaNombre || 'Café';
    document.getElementById('visorContador').textContent = (actual + 1) + ' de ' + visibles.length;
  }
  var origen = null;
  function abrir(i) {
    origen = document.activeElement;
    mostrar(i);
    if (typeof visor.showModal === 'function') visor.showModal();
    else visor.setAttribute('open', '');
  }
  function cerrar() { visor.close ? visor.close() : visor.removeAttribute('open'); }
  visor.addEventListener('close', function () { if (origen) origen.focus(); });
  document.getElementById('visorCerrar').addEventListener('click', cerrar);
  document.getElementById('visorAnterior').addEventListener('click', function () { mostrar(actual - 1); });
  document.getElementById('visorSiguiente').addEventListener('click', function () { mostrar(actual + 1); });
  visor.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
    if (e.key === 'ArrowRight') mostrar(actual + 1);
  });
  visor.addEventListener('click', function (e) { if (e.target === visor) cerrar(); });

  pintarFiltros();
  pintar();

  /* ---------- Fotos publicadas desde la API (administradores) ---------- */
  if (window.Cafe) {
    window.Cafe.api('/galeria?limit=50', { autenticar: false }).then(function (r) {
      var extra = (r.data || []).map(function (f) {
        var src = urlSegura(f.imagen_url);
        if (!src) return null;
        var nombreTema = f.categoria && f.categoria.nombre;
        var clave = slug(nombreTema);
        var tema = TEMAS[clave] ? clave : Object.keys(TEMAS).find(function (k) { return slug(TEMAS[k]) === clave; });
        if (!tema && nombreTema) { TEMAS[clave] = nombreTema; tema = clave; }
        return { src: src, tema: tema || 'cultura', titulo: f.titulo, descripcion: f.descripcion };
      }).filter(Boolean);
      var conocidas = fotos.map(function (f) { return f.src; });
      extra = extra.filter(function (f) { return conocidas.indexOf(f.src) === -1; });
      if (extra.length) { fotos = fotos.concat(extra); pintarFiltros(); pintar(); }
    }).catch(function () { /* se muestran solo las fotos locales */ });
  }
})();
