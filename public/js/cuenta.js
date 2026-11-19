/* Café Hondureño · cuenta: inicio de sesión, registro, perfil, curiosidades y cambio de contraseña */
(function () {
  'use strict';
  var C = window.Cafe;
  var R = window.Reglas;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Mostrar / ocultar contraseña ---------- */
  document.querySelectorAll('.ver-clave').forEach(function (boton) {
    var campo = boton.previousElementSibling;
    boton.setAttribute('aria-label', 'Mostrar contraseña');
    boton.addEventListener('click', function () {
      var visible = campo.type === 'text';
      campo.type = visible ? 'password' : 'text';
      boton.textContent = visible ? 'Mostrar' : 'Ocultar';
      boton.setAttribute('aria-pressed', String(!visible));
      boton.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });

  /* ---------- Pestañas accesibles ---------- */
  var pestanas = [$('tab-login'), $('tab-registro')];
  function activar(tab) {
    pestanas.forEach(function (t) {
      var activa = t === tab;
      t.setAttribute('aria-selected', String(activa));
      t.tabIndex = activa ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !activa;
    });
  }
  pestanas.forEach(function (t, i) {
    t.addEventListener('click', function () { activar(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var otra = pestanas[(i + 1) % 2];
      activar(otra);
      otra.focus();
    });
  });
  if (location.hash === '#registro') activar($('tab-registro'));

  /* ---------- Lista de requisitos de la contraseña en vivo ---------- */
  function vigilarPassword(idCampo, idLista, datosPersonales) {
    var lista = $(idLista);
    function pintar() {
      var resultado = R.evaluarPassword($(idCampo).value, datosPersonales());
      lista.replaceChildren();
      resultado.reglas.forEach(function (regla) {
        var li = document.createElement('li');
        li.textContent = regla.mensaje;
        if (regla.ok) li.className = 'cumple';
        lista.appendChild(li);
      });
      return resultado;
    }
    $(idCampo).addEventListener('input', pintar);
    pintar();
    return pintar;
  }
  var datosRegistro = function () { return { nombre: $('reg-nombre').value, correo: $('reg-correo').value }; };
  var evaluarRegistro = vigilarPassword('reg-password', 'requisitos', datosRegistro);
  $('reg-nombre').addEventListener('input', evaluarRegistro);
  $('reg-correo').addEventListener('input', evaluarRegistro);
  var evaluarNueva = vigilarPassword('clave-nueva', 'requisitosNueva', function () { return C.Sesion.usuario() || {}; });

  /* ---------- Utilidades ---------- */
  function mostrarErroresApi(error, mapa, aviso) {
    (error.errores || []).forEach(function (x) { if (mapa[x.campo]) C.marcarError(mapa[x.campo], x.mensaje); });
    C.aviso(aviso, error.message, 'error');
  }
  function primerError(errores) {
    var campos = Object.keys(errores).filter(function (k) { return errores[k]; });
    if (campos.length) $(campos[0]).focus();
    return campos.length > 0;
  }

  /* ---------- Iniciar sesión ---------- */
  $('formLogin').addEventListener('submit', async function (e) {
    e.preventDefault();
    var aviso = $('avisoLogin');
    var correo = R.limpiarLinea($('login-correo').value).toLowerCase();
    var errores = {
      'login-correo': correo ? '' : 'Escribe tu correo electrónico.',
      'login-password': $('login-password').value ? '' : 'Escribe tu contraseña.',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    if (primerError(errores)) return;

    var boton = e.target.querySelector('button[type="submit"]');
    C.ocupado(boton, true, 'Entrando…');
    try {
      var r = await C.api('/auth/login', { metodo: 'POST', autenticar: false, cuerpo: { correo: correo, password: $('login-password').value } });
      C.Sesion.guardar(r.data);
      e.target.reset();
      C.aviso(aviso, '');
      mostrarPerfil();
    } catch (error) {
      mostrarErroresApi(error, { correo: 'login-correo', password: 'login-password' }, aviso);
    } finally {
      C.ocupado(boton, false);
    }
  });

  /* ---------- Crear cuenta ---------- */
  function validarRegistro() {
    var nombre = R.validarNombre($('reg-nombre').value);
    var correo = R.validarCorreo($('reg-correo').value);
    var clave = evaluarRegistro();
    var errores = {
      'reg-nombre': nombre.ok ? '' : nombre.mensaje,
      'reg-correo': correo.ok ? '' : correo.mensaje,
      'reg-password': clave.ok ? '' : 'La contraseña todavía no cumple todos los requisitos de la lista.',
      'reg-confirmar': $('reg-confirmar').value === $('reg-password').value && $('reg-confirmar').value ? '' : 'Las contraseñas no coinciden.',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    return { errores: errores, nombre: nombre.valor, correo: correo.valor };
  }
  ['reg-nombre', 'reg-correo'].forEach(function (id) {
    $(id).addEventListener('blur', function () {
      if (!$(id).value) return;
      var r = id === 'reg-nombre' ? R.validarNombre($(id).value) : R.validarCorreo($(id).value);
      C.marcarError(id, r.ok ? '' : r.mensaje);
    });
  });

  $('formRegistro').addEventListener('submit', async function (e) {
    e.preventDefault();
    var aviso = $('avisoRegistro');
    if ($('reg-sitio').value) return; // campo trampa: solo un robot lo llena
    var v = validarRegistro();
    if (primerError(v.errores)) { C.aviso(aviso, 'Revisa los campos marcados.', 'error'); return; }

    var boton = e.target.querySelector('button[type="submit"]');
    C.ocupado(boton, true, 'Creando cuenta…');
    try {
      var r = await C.api('/auth/registro', {
        metodo: 'POST',
        autenticar: false,
        cuerpo: { nombre: v.nombre, correo: v.correo, password: $('reg-password').value, confirmar_password: $('reg-confirmar').value },
      });
      C.Sesion.guardar(r.data);
      e.target.reset();
      evaluarRegistro();
      C.aviso(aviso, '');
      mostrarPerfil('Tu cuenta está lista. ¡Bienvenido!');
    } catch (error) {
      mostrarErroresApi(error, { nombre: 'reg-nombre', correo: 'reg-correo', password: 'reg-password', confirmar_password: 'reg-confirmar' }, aviso);
    } finally {
      C.ocupado(boton, false);
    }
  });

  /* ---------- Perfil ---------- */
  function pintarPerfil(u) {
    $('perfilSaludo').textContent = 'Hola, ' + (u.nombre || '').split(' ')[0];
    $('perfilNombre').textContent = u.nombre || '';
    $('perfilCorreo').textContent = u.correo || '';
    $('perfilRol').textContent = u.rol === 'admin' || u.rol === 'administrador' ? 'Administrador' : 'Usuario';
    $('perfilFecha').textContent = u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  }

  async function mostrarPerfil(mensaje) {
    $('panelAcceso').hidden = true;
    $('panelPerfil').hidden = false;
    var guardado = C.Sesion.usuario();
    if (guardado) pintarPerfil(guardado);
    C.aviso($('avisoPerfil'), mensaje || '', mensaje ? 'exito' : '');
    $('perfilSaludo').setAttribute('tabindex', '-1');
    $('perfilSaludo').focus();
    try {
      var r = await C.api('/auth/perfil');
      C.Sesion.actualizarUsuario(r.data);
      pintarPerfil(r.data);
      evaluarNueva();
    } catch (error) {
      if (error.estado === 401 || error.estado === 403) mostrarAcceso(error.message);
      else C.aviso($('avisoPerfil'), error.message, 'error');
    }
    cargarCategorias();
  }

  function mostrarAcceso(mensaje) {
    C.Sesion.cerrar();
    $('panelPerfil').hidden = true;
    $('panelAcceso').hidden = false;
    C.aviso($('avisoLogin'), mensaje || '', mensaje ? 'error' : '');
  }

  $('botonSalir').addEventListener('click', async function () {
    try { await C.api('/auth/logout', { metodo: 'POST' }); } catch (e) { /* se cierra igual en el navegador */ }
    mostrarAcceso();
    C.aviso($('avisoLogin'), 'Cerraste sesión.', 'exito');
  });

  /* ---------- Cambiar contraseña ---------- */
  $('formClave').addEventListener('submit', async function (e) {
    e.preventDefault();
    var aviso = $('avisoClave');
    var nueva = evaluarNueva();
    var errores = {
      'clave-actual': $('clave-actual').value ? '' : 'Escribe tu contraseña actual.',
      'clave-nueva': !nueva.ok ? 'La contraseña nueva todavía no cumple todos los requisitos.'
        : $('clave-nueva').value === $('clave-actual').value ? 'La contraseña nueva debe ser diferente de la actual.' : '',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    if (primerError(errores)) return;

    var boton = e.target.querySelector('button[type="submit"]');
    C.ocupado(boton, true, 'Guardando…');
    try {
      var r = await C.api('/auth/password', { metodo: 'PATCH', cuerpo: { password_actual: $('clave-actual').value, password_nueva: $('clave-nueva').value } });
      C.Sesion.guardar(r.data); // la API entrega un token nuevo: el anterior deja de valer
      e.target.reset();
      evaluarNueva();
      C.aviso(aviso, 'Contraseña actualizada. Las demás sesiones abiertas se cerraron.', 'exito');
    } catch (error) {
      mostrarErroresApi(error, { password_actual: 'clave-actual', password_nueva: 'clave-nueva' }, aviso);
    } finally {
      C.ocupado(boton, false);
    }
  });

  /* ---------- Compartir una curiosidad ---------- */
  var categoriasCargadas = false;
  async function cargarCategorias() {
    if (categoriasCargadas) return;
    var select = $('cur-categoria');
    try {
      var r = await C.api('/categorias?tipo=curiosidad', { autenticar: false });
      select.replaceChildren(new Option('Elige un tema', ''));
      (r.data || []).forEach(function (c) { select.appendChild(new Option(c.nombre, String(c.id))); });
      categoriasCargadas = true;
    } catch (error) {
      select.replaceChildren(new Option('No se pudieron cargar los temas', ''));
    }
  }

  $('formCuriosidad').addEventListener('submit', async function (e) {
    e.preventDefault();
    var aviso = $('avisoCuriosidad');
    var titulo = R.limpiarLinea($('cur-titulo').value);
    var descripcion = R.limpiarMultilinea($('cur-descripcion').value);
    var errores = {
      'cur-titulo': titulo.length >= 5 ? '' : 'Escribe un título de al menos 5 caracteres.',
      'cur-categoria': $('cur-categoria').value ? '' : 'Elige un tema.',
      'cur-descripcion': descripcion.length >= 20 ? '' : 'Cuéntanos un poco más (al menos 20 caracteres).',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    if (primerError(errores)) return;

    var boton = e.target.querySelector('button[type="submit"]');
    C.ocupado(boton, true, 'Publicando…');
    try {
      await C.api('/curiosidades', { metodo: 'POST', cuerpo: { titulo: titulo, descripcion: descripcion, categoria_id: Number($('cur-categoria').value) } });
      e.target.reset();
      C.aviso(aviso, 'Curiosidad publicada. Ya aparece en la página de curiosidades.', 'exito');
    } catch (error) {
      mostrarErroresApi(error, { titulo: 'cur-titulo', descripcion: 'cur-descripcion', categoria_id: 'cur-categoria' }, aviso);
    } finally {
      C.ocupado(boton, false);
    }
  });

  if (C.Sesion.token()) mostrarPerfil();
})();
