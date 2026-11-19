/* =========================================================
   Café Hondureño · comportamiento común de todas las páginas
   (tema, menú, botón "arriba", sesión y llamadas a la API)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Tema claro / oscuro ---------- */
  function iniciarTema() {
    var boton = document.getElementById('botonTema');
    if (!boton) return;
    var raiz = document.documentElement;
    function actualizar() {
      var oscuro = raiz.getAttribute('data-tema') === 'oscuro';
      boton.setAttribute('aria-pressed', String(oscuro));
      boton.setAttribute('aria-label', oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    }
    boton.addEventListener('click', function () {
      var nuevo = raiz.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
      raiz.setAttribute('data-tema', nuevo);
      try { localStorage.setItem('tema', nuevo); } catch (e) { /* sin almacenamiento */ }
      actualizar();
    });
    actualizar();
  }

  /* ---------- Menú en pantallas pequeñas ---------- */
  function iniciarMenu() {
    var boton = document.getElementById('botonMenu');
    var nav = document.getElementById('navegacion');
    if (!boton || !nav) return;
    function cerrar() {
      nav.classList.remove('abierta');
      boton.setAttribute('aria-expanded', 'false');
    }
    boton.addEventListener('click', function () {
      var abierta = nav.classList.toggle('abierta');
      boton.setAttribute('aria-expanded', String(abierta));
      if (abierta) { var primero = nav.querySelector('a'); if (primero) primero.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) cerrar(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('abierta')) { cerrar(); boton.focus(); }
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', cerrar);
  }

  /* ---------- Botón "volver arriba" y año del pie ---------- */
  function iniciarArriba() {
    var boton = document.getElementById('botonArriba');
    if (boton) {
      window.addEventListener('scroll', function () {
        boton.classList.toggle('visible', window.scrollY > 600);
      }, { passive: true });
      boton.addEventListener('click', function () {
        window.scrollTo({ top: 0 });
        var salto = document.getElementById('contenido');
        if (salto) salto.focus({ preventScroll: true });
      });
    }
    document.querySelectorAll('[data-anio]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Sesión ----------
     El token se guarda en sessionStorage (se borra al cerrar la pestaña), no en
     localStorage, para reducir el tiempo en que un token robado sería útil. */
  var Sesion = {
    token: function () {
      try { return sessionStorage.getItem('token'); } catch (e) { return null; }
    },
    usuario: function () {
      try { return JSON.parse(sessionStorage.getItem('usuario') || 'null'); } catch (e) { return null; }
    },
    guardar: function (datos) {
      try {
        sessionStorage.setItem('token', datos.token);
        sessionStorage.setItem('usuario', JSON.stringify(datos.usuario));
      } catch (e) { /* sin almacenamiento */ }
      pintarCuenta();
    },
    actualizarUsuario: function (usuario) {
      try { sessionStorage.setItem('usuario', JSON.stringify(usuario)); } catch (e) { /* sin almacenamiento */ }
      pintarCuenta();
    },
    cerrar: function () {
      try { sessionStorage.removeItem('token'); sessionStorage.removeItem('usuario'); } catch (e) { /* sin almacenamiento */ }
      pintarCuenta();
    },
  };

  function pintarCuenta() {
    var enlace = document.getElementById('enlaceCuenta');
    if (!enlace) return;
    var usuario = Sesion.usuario();
    var primerNombre = usuario && usuario.nombre ? usuario.nombre.split(' ')[0] : '';
    enlace.textContent = primerNombre ? 'Hola, ' + primerNombre : 'Mi cuenta';
  }

  /* ---------- Llamadas a la API ---------- */
  function ErrorApi(mensaje, estado, errores) {
    this.name = 'ErrorApi';
    this.message = mensaje;
    this.estado = estado;
    this.errores = errores || [];
  }
  ErrorApi.prototype = Object.create(Error.prototype);

  async function api(ruta, opciones) {
    opciones = opciones || {};
    var cabeceras = { Accept: 'application/json' };
    if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
    var token = Sesion.token();
    if (token && opciones.autenticar !== false) cabeceras.Authorization = 'Bearer ' + token;

    var control = new AbortController();
    var limite = setTimeout(function () { control.abort(); }, opciones.tiempo || 15000);
    var respuesta;
    try {
      respuesta = await fetch('/api' + ruta, {
        method: opciones.metodo || 'GET',
        headers: cabeceras,
        body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
        credentials: 'same-origin',
        signal: control.signal,
      });
    } catch (e) {
      throw new ErrorApi('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', 0);
    } finally {
      clearTimeout(limite);
    }

    var json = null;
    try { json = await respuesta.json(); } catch (e) { json = null; }
    if (!respuesta.ok || !json || json.status !== 'success') {
      if (respuesta.status === 401 && token && opciones.autenticar !== false) Sesion.cerrar();
      var mensaje = (json && json.message) || 'El servidor no pudo completar la solicitud (' + respuesta.status + ').';
      throw new ErrorApi(mensaje, respuesta.status, json && json.errors);
    }
    return json;
  }

  /* ---------- Utilidades para formularios ---------- */
  function marcarError(campo, mensaje) {
    var entrada = document.getElementById(campo);
    var error = document.getElementById('error-' + campo);
    if (entrada) {
      if (mensaje) entrada.setAttribute('aria-invalid', 'true');
      else entrada.removeAttribute('aria-invalid');
    }
    if (error) error.textContent = mensaje || '';
  }

  function aviso(elemento, mensaje, tipo) {
    if (!elemento) return;
    elemento.className = 'aviso' + (tipo ? ' aviso--' + tipo : '');
    elemento.textContent = mensaje || '';
  }

  function ocupado(boton, estado, textoOcupado) {
    if (!boton) return;
    if (estado) {
      boton.dataset.texto = boton.textContent;
      boton.textContent = textoOcupado || 'Enviando…';
      boton.setAttribute('aria-busy', 'true');
      boton.disabled = true;
    } else {
      boton.textContent = boton.dataset.texto || boton.textContent;
      boton.removeAttribute('aria-busy');
      boton.disabled = false;
    }
  }

  /** Si una imagen no carga, se oculta con elegancia en lugar de mostrar el ícono roto. */
  function iniciarImagenes() {
    document.addEventListener('error', function (e) {
      var img = e.target;
      if (img && img.tagName === 'IMG' && !img.dataset.fallo) {
        img.dataset.fallo = '1';
        img.alt = img.alt || '';
        img.style.visibility = 'hidden';
      }
    }, true);
  }

  window.Cafe = { api: api, Sesion: Sesion, ErrorApi: ErrorApi, marcarError: marcarError, aviso: aviso, ocupado: ocupado };

  iniciarTema();
  iniciarMenu();
  iniciarArriba();
  iniciarImagenes();
  pintarCuenta();
})();
