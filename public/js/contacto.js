/* Café Hondureño · formulario de contacto (valida con las mismas reglas que la API) */
(function () {
  'use strict';
  var C = window.Cafe;
  var R = window.Reglas;
  var form = document.getElementById('formContacto');
  var aviso = document.getElementById('avisoContacto');
  var mensaje = document.getElementById('mensaje');
  var contador = document.getElementById('contadorMensaje');

  mensaje.addEventListener('input', function () { contador.textContent = mensaje.value.length; });

  // Si hay sesión, se completan nombre y correo.
  var usuario = C.Sesion.usuario();
  if (usuario) {
    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('correo').value = usuario.correo || '';
  }

  function validar() {
    var errores = {};
    var nombre = R.validarNombre(document.getElementById('nombre').value);
    if (!nombre.ok) errores.nombre = nombre.mensaje;
    var correo = R.validarCorreo(document.getElementById('correo').value, { bloquearTemporales: false });
    if (!correo.ok) errores.correo = correo.mensaje;
    if (!document.getElementById('asunto').value) errores.asunto = 'Elige el motivo del mensaje.';
    var texto = R.limpiarMultilinea(mensaje.value);
    if (texto.length < 10) errores.mensaje = 'Escribe un mensaje de al menos 10 caracteres.';
    else if (texto.length > 1000) errores.mensaje = 'El mensaje no puede superar 1000 caracteres.';
    ['nombre', 'correo', 'asunto', 'mensaje'].forEach(function (c) { C.marcarError(c, errores[c]); });
    return { errores: errores, datos: { nombre: nombre.valor, correo: correo.valor, mensaje: texto } };
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var r = validar();
    var campos = Object.keys(r.errores);
    if (campos.length) {
      C.aviso(aviso, 'Revisa los campos marcados.', 'error');
      document.getElementById(campos[0]).focus();
      return;
    }
    var boton = form.querySelector('button[type="submit"]');
    C.ocupado(boton, true);
    C.aviso(aviso, '');
    try {
      await C.api('/contacto', {
        metodo: 'POST',
        cuerpo: {
          nombre: r.datos.nombre,
          correo: r.datos.correo,
          asunto: document.getElementById('asunto').value,
          mensaje: r.datos.mensaje,
          sitio_web: document.getElementById('sitio_web').value,
        },
      });
      form.reset();
      contador.textContent = '0';
      C.aviso(aviso, 'Mensaje enviado. Gracias por escribirnos; te responderemos pronto a tu correo.', 'exito');
    } catch (error) {
      (error.errores || []).forEach(function (x) { C.marcarError(x.campo, x.mensaje); });
      C.aviso(aviso, error.message, 'error');
    } finally {
      C.ocupado(boton, false);
    }
  });
})();
