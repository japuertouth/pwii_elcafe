/* Reglas de validación compartidas por el navegador y la API.
   El backend las carga con require() y las páginas con <script src="js/reglas.js">,
   así las dos partes aplican exactamente las mismas restricciones. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Reglas = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PASSWORD_MIN = 10;
  var PASSWORD_MAX = 64;
  var BCRYPT_MAX_BYTES = 72;
  var NOMBRE_MIN = 2;
  var NOMBRE_MAX = 100;
  var CORREO_MAX = 254;

  var CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g;
  var NOMBRE = /^\p{L}[\p{L}\p{M}]*\.?(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*\.?)*$/u;
  var CORREO_LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
  var CORREO_DOMINIO = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

  var DOMINIOS_TEMPORALES = [
    'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com',
    '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'trashmail.com', 'getnada.com',
    'maildrop.cc', 'dispostable.com', 'throwawaymail.com', 'fakeinbox.com', 'mintemail.com',
    'mohmal.com', 'emailondeck.com', 'tempail.com', 'spamgourmet.com', 'mailnesia.com',
  ];

  var COMUNES = [
    'password', 'passw0rd', 'contrasena', 'contraseña', 'clave', 'micontrasena', 'miclave', 'secreto',
    'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'abc', 'abcdef', 'abcdefgh',
    'admin', 'administrador', 'root', 'usuario', 'user', 'login', 'welcome', 'bienvenido',
    'iloveyou', 'teamo', 'tequiero', 'amor', 'amorcito', 'princesa', 'monkey', 'dragon', 'master',
    'football', 'futbol', 'soccer', 'baseball', 'superman', 'batman', 'pokemon', 'starwars',
    'sunshine', 'shadow', 'letmein', 'trustno', 'whatever', 'freedom', 'hello', 'hola', 'holamundo',
    'honduras', 'catracho', 'catracha', 'tegucigalpa', 'sanpedrosula', 'olimpia', 'motagua',
    'cafe', 'cafehondureno', 'cafehondureño', 'cafecito', 'marcala', 'copan', 'lempira',
    'google', 'facebook', 'instagram', 'microsoft', 'windows', 'samsung', 'iphone', 'android',
    'jesus', 'diosesamor', 'familia', 'mama', 'papa', 'gato', 'perro', 'mariposa', 'estrella',
    'changeme', 'default', 'test', 'prueba', 'demo', 'invitado', 'guest', 'temporal', 'nueva', 'nuevo',
  ];

  var LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' };

  function texto(valor) {
    return typeof valor === 'string' ? valor : '';
  }

  /** Normaliza Unicode, quita caracteres de control/invisibles y espacios repetidos. */
  function limpiarLinea(valor) {
    return texto(valor).normalize('NFKC').replace(CONTROL, '').replace(/\s+/g, ' ').trim();
  }

  /** Igual que limpiarLinea, pero conserva los saltos de línea (mensajes largos). */
  function limpiarMultilinea(valor) {
    return texto(valor)
      .normalize('NFKC')
      .replace(/\r\n?/g, '\n')
      .replace(CONTROL, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function sinAcentos(valor) {
    return valor.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function plano(valor) {
    return sinAcentos(texto(valor).toLowerCase());
  }

  function deLeet(valor) {
    return valor.replace(/[4@31!05$7]/g, function (c) { return LEET[c]; });
  }

  function validarNombre(valor) {
    var limpio = limpiarLinea(valor);
    if (!limpio) return { ok: false, valor: limpio, mensaje: 'Escribe tu nombre.' };
    if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
      return { ok: false, valor: limpio, mensaje: 'El nombre debe tener entre ' + NOMBRE_MIN + ' y ' + NOMBRE_MAX + ' caracteres.' };
    }
    if (!NOMBRE.test(limpio)) {
      return { ok: false, valor: limpio, mensaje: 'El nombre solo puede llevar letras, espacios, guiones, apóstrofos y puntos de abreviatura.' };
    }
    if ((limpio.match(/\p{L}/gu) || []).length < 2) {
      return { ok: false, valor: limpio, mensaje: 'El nombre debe tener al menos dos letras.' };
    }
    return { ok: true, valor: limpio };
  }

  function validarCorreo(valor, opciones) {
    var bloquearTemporales = !opciones || opciones.bloquearTemporales !== false;
    var limpio = limpiarLinea(valor).toLowerCase();
    if (!limpio) return { ok: false, valor: limpio, mensaje: 'Escribe tu correo electrónico.' };
    if (limpio.length > CORREO_MAX) return { ok: false, valor: limpio, mensaje: 'El correo no puede superar ' + CORREO_MAX + ' caracteres.' };
    var partes = limpio.split('@');
    var formato = 'Escribe un correo con el formato nombre@dominio.com.';
    if (partes.length !== 2) return { ok: false, valor: limpio, mensaje: formato };
    var local = partes[0];
    var dominio = partes[1];
    if (!local || local.length > 64 || !CORREO_LOCAL.test(local)) return { ok: false, valor: limpio, mensaje: formato };
    if (!dominio || dominio.length > 253 || !CORREO_DOMINIO.test(dominio)) return { ok: false, valor: limpio, mensaje: formato };
    if (bloquearTemporales && DOMINIOS_TEMPORALES.indexOf(dominio) !== -1) {
      return { ok: false, valor: limpio, mensaje: 'Usa un correo permanente; no se aceptan correos temporales.' };
    }
    return { ok: true, valor: limpio };
  }

  /** Palabras personales que no pueden aparecer dentro de la contraseña. */
  function palabrasPersonales(datos) {
    var lista = [];
    var nombre = plano(limpiarLinea(datos && datos.nombre));
    nombre.split(/[\s'\u2019.-]+/).forEach(function (p) { if (p.length >= 3) lista.push(p); });
    var junto = nombre.replace(/[^a-z]/g, '');
    if (junto.length >= 3) lista.push(junto);

    var correo = plano(limpiarLinea(datos && datos.correo));
    if (correo.indexOf('@') > 0) {
      var local = correo.split('@')[0];
      var dominio = correo.split('@')[1].split('.')[0];
      var localLetras = local.replace(/[^a-z0-9]/g, '');
      if (localLetras.length >= 3) lista.push(localLetras);
      local.split(/[._+-]+/).forEach(function (p) { if (p.length >= 3) lista.push(p); });
      if (dominio.length >= 4 && ['gmail', 'hotmail', 'outlook', 'yahoo', 'icloud', 'live'].indexOf(dominio) === -1) lista.push(dominio);
    }
    return lista.filter(function (p, i) { return lista.indexOf(p) === i; });
  }

  function tieneSecuencia(valor) {
    var v = valor.toLowerCase();
    if (/(.)\1{3,}/.test(v)) return true;
    var filas = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    for (var i = 0; i + 4 <= v.length; i++) {
      var trozo = v.slice(i, i + 4);
      var reves = trozo.split('').reverse().join('');
      for (var f = 0; f < filas.length; f++) {
        if (filas[f].indexOf(trozo) !== -1 || filas[f].indexOf(reves) !== -1) return true;
      }
    }
    return false;
  }

  function bytesUtf8(valor) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(valor).length;
    return unescape(encodeURIComponent(valor)).length;
  }

  /**
   * Evalúa una contraseña. Devuelve la lista completa de reglas con ok=true/false
   * para que el formulario pueda mostrar una lista de comprobación en vivo.
   */
  function evaluarPassword(password, datos) {
    var p = texto(password).normalize('NFC');
    var bajo = plano(p);
    var nucleo = deLeet(bajo.replace(/^[^a-z]+|[^a-z]+$/g, ''));
    var personales = palabrasPersonales(datos || {});
    var contienePersonal = personales.some(function (palabra) {
      return bajo.indexOf(palabra) !== -1 || deLeet(bajo).indexOf(palabra) !== -1;
    });

    var reglas = [
      { id: 'longitud', ok: p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX && bytesUtf8(p) <= BCRYPT_MAX_BYTES,
        mensaje: 'Entre ' + PASSWORD_MIN + ' y ' + PASSWORD_MAX + ' caracteres' },
      { id: 'minuscula', ok: /\p{Ll}/u.test(p), mensaje: 'Una letra minúscula' },
      { id: 'mayuscula', ok: /\p{Lu}/u.test(p), mensaje: 'Una letra mayúscula' },
      { id: 'numero', ok: /\d/.test(p), mensaje: 'Un número' },
      { id: 'simbolo', ok: /[^\p{L}\p{N}\s]/u.test(p), mensaje: 'Un símbolo, por ejemplo # $ % & * ?' },
      { id: 'espacios', ok: p.length > 0 && p === p.trim(), mensaje: 'Sin espacios al inicio ni al final' },
      { id: 'personal', ok: p.length > 0 && !contienePersonal, mensaje: 'Que no incluya tu nombre ni tu correo' },
      { id: 'comun', ok: p.length > 0 && COMUNES.indexOf(nucleo) === -1 && COMUNES.indexOf(bajo) === -1,
        mensaje: 'Que no sea una contraseña común' },
      { id: 'secuencia', ok: p.length > 0 && !tieneSecuencia(p), mensaje: 'Sin secuencias como 1234, abcd o aaaa' },
    ];
    return { ok: reglas.every(function (r) { return r.ok; }), reglas: reglas };
  }

  /** Mensaje único con las reglas que fallan (lo usa la API). */
  function erroresPassword(password, datos) {
    if (typeof password !== 'string' || password.length === 0) return ['La contraseña es obligatoria'];
    var resultado = evaluarPassword(password, datos);
    return resultado.reglas.filter(function (r) { return !r.ok; }).map(function (r) { return r.mensaje; });
  }

  return {
    PASSWORD_MIN: PASSWORD_MIN,
    PASSWORD_MAX: PASSWORD_MAX,
    NOMBRE_MAX: NOMBRE_MAX,
    CORREO_MAX: CORREO_MAX,
    limpiarLinea: limpiarLinea,
    limpiarMultilinea: limpiarMultilinea,
    validarNombre: validarNombre,
    validarCorreo: validarCorreo,
    evaluarPassword: evaluarPassword,
    erroresPassword: erroresPassword,
  };
});
