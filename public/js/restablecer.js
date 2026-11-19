/* Café Hondureño · crear una contraseña nueva con el enlace recibido por correo */
(function () {
  'use strict';
  var C = window.Cafe;
  var R = window.Reglas;
  var $ = function (id) { return document.getElementById(id); };

  // El token viaja en el "#" de la dirección: así no se envía al servidor ni queda en registros.
  var token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
  if (token) history.replaceState(null, '', location.pathname);

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

  var lista = $('requisitos');
  function evaluar() {
    var resultado = R.evaluarPassword($('nueva-password').value, {});
    lista.replaceChildren();
    resultado.reglas.forEach(function (regla) {
      var li = document.createElement('li');
      li.textContent = regla.mensaje;
      if (regla.ok) li.className = 'cumple';
      lista.appendChild(li);
    });
    return resultado;
  }
  $('nueva-password').addEventListener('input', evaluar);
  evaluar();

  var form = $('formRestablecer');
  var aviso = $('avisoRestablecer');
  if (!token) {
    form.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
    C.aviso(aviso, 'Este enlace no es válido o está incompleto. Pide uno nuevo en Mi cuenta → "¿Olvidaste tu contraseña?".', 'error');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var clave = evaluar();
    var errores = {
      'nueva-password': clave.ok ? '' : 'La contraseña todavía no cumple todos los requisitos de la lista.',
      'nueva-confirmar': $('nueva-confirmar').value && $('nueva-confirmar').value === $('nueva-password').value ? '' : 'Las contraseñas no coinciden.',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    var primero = Object.keys(errores).find(function (k) { return errores[k]; });
    if (primero) { $(primero).focus(); return; }

    var boton = form.querySelector('button[type="submit"]');
    C.ocupado(boton, true, 'Guardando…');
    try {
      await C.api('/auth/restablecer', {
        metodo: 'POST',
        autenticar: false,
        cuerpo: { token: token, password_nueva: $('nueva-password').value, confirmar_password: $('nueva-confirmar').value },
      });
      C.Sesion.cerrar();
      form.hidden = true;
      $('restablecerListo').hidden = false;
      $('restablecerListo').querySelector('a').focus();
    } catch (error) {
      (error.errores || []).forEach(function (x) {
        if (x.campo === 'password_nueva') C.marcarError('nueva-password', x.mensaje);
        if (x.campo === 'confirmar_password') C.marcarError('nueva-confirmar', x.mensaje);
      });
      C.aviso(aviso, error.message, 'error');
    } finally {
      C.ocupado(boton, false);
    }
  });
})();
