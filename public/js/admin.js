/* Café Hondureño · panel de administración
   Todo el contenido se construye con textContent: nunca se inserta HTML recibido de la API.
   La API vuelve a comprobar en cada petición que la cuenta sea de administrador. */
(function () {
  'use strict';
  var C = window.Cafe;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Utilidades ---------- */
  function el(etiqueta, props, hijos) {
    var nodo = document.createElement(etiqueta);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'texto') nodo.textContent = props[k];
      else if (k === 'clase') nodo.className = props[k];
      else if (k.indexOf('on') === 0) nodo.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== undefined && props[k] !== null) nodo.setAttribute(k, props[k]);
    });
    (hijos || []).forEach(function (h) { if (h) nodo.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return nodo;
  }

  function fecha(valor) {
    if (!valor) return '';
    return new Date(valor).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /** Botón que pide un segundo clic para confirmar (sin ventanas emergentes del navegador). */
  function botonConfirmar(texto, textoConfirmar, accion) {
    var boton = el('button', { type: 'button', clase: 'boton boton--contorno boton--peligro', texto: texto });
    var espera = null;
    boton.addEventListener('click', async function () {
      if (!espera) {
        boton.textContent = textoConfirmar;
        boton.classList.add('confirmar');
        espera = setTimeout(function () { boton.textContent = texto; boton.classList.remove('confirmar'); espera = null; }, 4000);
        return;
      }
      clearTimeout(espera);
      espera = null;
      await accion(boton);
    });
    return boton;
  }

  async function conBoton(boton, textoOcupado, accion, aviso) {
    C.ocupado(boton, true, textoOcupado);
    try {
      await accion();
    } catch (error) {
      C.aviso(aviso, error.message, 'error');
    } finally {
      if (boton.isConnected) C.ocupado(boton, false);
    }
  }

  /* ---------- Acceso ---------- */
  function sinAcceso(texto) {
    $('sinAcceso').hidden = false;
    $('panelAdmin').hidden = true;
    if (texto) $('sinAccesoTexto').textContent = texto;
  }

  async function iniciar() {
    if (!C.Sesion.token()) return sinAcceso();
    try {
      var r = await C.api('/auth/perfil');
      C.Sesion.actualizarUsuario(r.data);
      if (r.data.rol !== 'admin' && r.data.rol !== 'administrador') {
        return sinAcceso('Tu cuenta no tiene permisos de administrador. Pide a un administrador que te los asigne.');
      }
    } catch (error) {
      return sinAcceso(error.estado === 401 ? 'Tu sesión venció. Inicia sesión de nuevo.' : error.message);
    }
    $('panelAdmin').hidden = false;
    iniciarPestanas();
    cargarMensajes(true);
    cargarPendientes();
  }

  /* ---------- Pestañas ---------- */
  var cargadas = {};
  function iniciarPestanas() {
    var pestanas = Array.prototype.slice.call(document.querySelectorAll('.pestanas--admin [role="tab"]'));
    function activar(tab) {
      pestanas.forEach(function (t) {
        var activa = t === tab;
        t.setAttribute('aria-selected', String(activa));
        t.tabIndex = activa ? 0 : -1;
        $(t.getAttribute('aria-controls')).hidden = !activa;
      });
      if (tab.id === 'tab-galeria' && !cargadas.galeria) { cargadas.galeria = true; cargarGaleria(); }
      if (tab.id === 'tab-regiones' && !cargadas.regiones) { cargadas.regiones = true; cargarRegiones(); }
    }
    pestanas.forEach(function (t, i) {
      t.addEventListener('click', function () { activar(t); });
      t.addEventListener('keydown', function (e) {
        var paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!paso) return;
        var otra = pestanas[(i + paso + pestanas.length) % pestanas.length];
        activar(otra);
        otra.focus();
      });
    });
  }

  /* ---------- Mensajes de contacto ---------- */
  var ASUNTOS = { informacion: 'Información sobre el café', productos: 'Productos', sugerencia: 'Sugerencia', otro: 'Otro motivo' };
  var mensajes = { filtro: 'false', pagina: 1 };

  document.querySelectorAll('#sec-mensajes [data-filtro]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('#sec-mensajes [data-filtro]').forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      mensajes.filtro = chip.dataset.filtro;
      cargarMensajes(true);
    });
  });
  $('masMensajes').addEventListener('click', function () { cargarMensajes(false); });

  async function cargarMensajes(reiniciar) {
    var lista = $('listaMensajes');
    var aviso = $('avisoMensajes');
    if (reiniciar) { mensajes.pagina = 1; lista.replaceChildren(); }
    var ruta = '/contacto?limit=20&page=' + mensajes.pagina + (mensajes.filtro ? '&leido=' + mensajes.filtro : '');
    try {
      var r = await C.api(ruta);
      $('cuentaMensajes').textContent = r.meta.sinLeer;
      r.data.forEach(function (m) { lista.appendChild(itemMensaje(m)); });
      if (lista.children.length === 0) {
        C.aviso(aviso, mensajes.filtro === 'false' ? 'No hay mensajes sin leer.' : 'Todavía no hay mensajes.');
      } else {
        C.aviso(aviso, '');
      }
      $('masMensajes').hidden = mensajes.pagina >= r.meta.totalPages;
      mensajes.pagina += 1;
    } catch (error) {
      C.aviso(aviso, error.message, 'error');
    }
  }

  function itemMensaje(m) {
    var aviso = $('avisoMensajes');
    var li = el('li', { clase: 'admin-item' + (m.leido ? '' : ' admin-item--nuevo') });
    var botonLeido = el('button', { type: 'button', clase: 'boton boton--contorno', texto: m.leido ? 'Marcar como no leído' : 'Marcar como leído' });
    botonLeido.addEventListener('click', function () {
      conBoton(botonLeido, 'Guardando…', async function () {
        var r = await C.api('/contacto/' + m.id + '/leido', { metodo: 'PATCH', cuerpo: { leido: !m.leido } });
        cargarMensajes(true);
        C.aviso(aviso, r.message, 'exito');
      }, aviso);
    });
    var borrar = botonConfirmar('Eliminar', '¿Eliminar? Toca otra vez', function (boton) {
      return conBoton(boton, 'Eliminando…', async function () {
        await C.api('/contacto/' + m.id, { metodo: 'DELETE' });
        li.remove();
        C.aviso(aviso, 'Mensaje eliminado.', 'exito');
        var r = await C.api('/contacto?limit=1');
        $('cuentaMensajes').textContent = r.meta.sinLeer;
      }, aviso);
    });
    var responder = el('a', {
      clase: 'boton',
      href: 'mailto:' + encodeURIComponent(m.correo) + '?subject=' + encodeURIComponent('Re: tu mensaje a Café Hondureño'),
      texto: 'Responder por correo',
    });
    li.append(
      el('div', { clase: 'admin-item__cabeza' }, [
        el('h3', { texto: m.nombre }),
        el('span', { clase: 'etiqueta-dato', texto: ASUNTOS[m.asunto] || m.asunto }),
        m.leido ? null : el('span', { clase: 'etiqueta-dato etiqueta-dato--nuevo', texto: 'Sin leer' }),
      ]),
      el('p', { clase: 'admin-item__meta' }, [m.correo + ' · ' + fecha(m.creado_en) + (m.usuario ? ' · usuario registrado' : '')]),
      el('p', { clase: 'admin-item__texto', texto: m.mensaje }),
      el('div', { clase: 'botones botones--compactos' }, [responder, botonLeido, borrar])
    );
    return li;
  }

  /* ---------- Curiosidades pendientes ---------- */
  async function cargarPendientes() {
    var lista = $('listaPendientes');
    var aviso = $('avisoCuriosidades');
    lista.replaceChildren();
    try {
      var r = await C.api('/curiosidades/pendientes?limit=50');
      $('cuentaCuriosidades').textContent = r.meta.total;
      if (r.data.length === 0) C.aviso(aviso, 'No hay curiosidades esperando revisión.');
      r.data.forEach(function (c) { lista.appendChild(itemPendiente(c)); });
    } catch (error) {
      C.aviso(aviso, error.message, 'error');
    }
  }

  function itemPendiente(c) {
    var aviso = $('avisoCuriosidades');
    var li = el('li', { clase: 'admin-item admin-item--nuevo' });
    var aprobar = el('button', { type: 'button', clase: 'boton', texto: 'Aprobar y publicar' });
    aprobar.addEventListener('click', function () {
      conBoton(aprobar, 'Publicando…', async function () {
        await C.api('/curiosidades/' + c.id + '/moderacion', { metodo: 'PATCH', cuerpo: { aprobada: true } });
        C.aviso(aviso, 'Publicada: "' + c.titulo + '".', 'exito');
        cargarPendientes();
      }, aviso);
    });
    var rechazar = botonConfirmar('Rechazar', '¿Rechazar y eliminar? Toca otra vez', function (boton) {
      return conBoton(boton, 'Eliminando…', async function () {
        await C.api('/curiosidades/' + c.id, { metodo: 'DELETE' });
        C.aviso(aviso, 'Curiosidad rechazada y eliminada.', 'exito');
        cargarPendientes();
      }, aviso);
    });
    li.append(
      el('div', { clase: 'admin-item__cabeza' }, [
        el('h3', { texto: c.titulo }),
        c.categoria ? el('span', { clase: 'etiqueta-dato', texto: c.categoria.nombre }) : null,
      ]),
      el('p', { clase: 'admin-item__meta', texto: 'Enviada por ' + (c.autor ? c.autor.nombre : 'usuario eliminado') + ' · ' + fecha(c.creado_en) }),
      el('p', { clase: 'admin-item__texto', texto: c.descripcion }),
      el('div', { clase: 'botones botones--compactos' }, [aprobar, rechazar])
    );
    return li;
  }

  /* ---------- Galería ---------- */
  var TEMAS_GALERIA = ['Regiones', 'Cultivo y cosecha', 'Granos', 'Cultura'];

  function urlSegura(url) {
    url = String(url || '').trim();
    if (/^https:\/\//i.test(url)) return url;
    if (/^\/?[\w./-]+$/.test(url) && url.indexOf('..') === -1) return url.charAt(0) === '/' ? url : '/' + url;
    return null;
  }

  async function cargarSelectores() {
    var categorias = $('foto-categoria');
    var r = await C.api('/categorias?tipo=galeria', { autenticar: false });
    categorias.replaceChildren(new Option('Elige un tema', ''));
    r.data.forEach(function (c) { categorias.appendChild(new Option(c.nombre, String(c.id))); });
    if (r.data.length === 0) {
      var crear = el('button', { type: 'button', clase: 'boton boton--contorno', texto: 'Crear los temas de la galería' });
      crear.addEventListener('click', function () {
        conBoton(crear, 'Creando…', async function () {
          for (var i = 0; i < TEMAS_GALERIA.length; i++) {
            await C.api('/categorias', { metodo: 'POST', cuerpo: { nombre: TEMAS_GALERIA[i], tipo: 'galeria' } });
          }
          crear.remove();
          C.aviso($('avisoFoto'), 'Temas creados: ' + TEMAS_GALERIA.join(', ') + '.', 'exito');
          await cargarSelectores();
        }, $('avisoFoto'));
      });
      C.aviso($('avisoFoto'), 'Todavía no hay temas para la galería. Créalos con el botón.', 'error');
      $('avisoFoto').after(crear);
    }
    var regiones = $('foto-region');
    var rr = await C.api('/regiones', { autenticar: false });
    regiones.replaceChildren(new Option('Sin región', ''));
    rr.data.forEach(function (x) { regiones.appendChild(new Option(x.nombre, String(x.id))); });
  }

  async function cargarFotos() {
    var lista = $('listaFotos');
    lista.replaceChildren();
    var r = await C.api('/galeria?limit=50', { autenticar: false });
    if (r.data.length === 0) lista.appendChild(el('li', { clase: 'vacio', texto: 'Aún no hay fotos agregadas desde el panel. Las 7 fotos base de la galería siempre se muestran.' }));
    r.data.forEach(function (f) {
      var src = urlSegura(f.imagen_url);
      var li = el('li', { clase: 'admin-foto' });
      var borrar = botonConfirmar('Eliminar', '¿Eliminar? Toca otra vez', function (boton) {
        return conBoton(boton, 'Eliminando…', async function () {
          await C.api('/galeria/' + f.id, { metodo: 'DELETE' });
          li.remove();
          C.aviso($('avisoFoto'), 'Foto eliminada.', 'exito');
        }, $('avisoFoto'));
      });
      li.append(
        src ? el('img', { src: src, alt: f.titulo, loading: 'lazy' }) : el('div', { clase: 'admin-foto__vacia', texto: 'Sin vista previa' }),
        el('div', {}, [
          el('h3', { texto: f.titulo }),
          el('p', { clase: 'admin-item__meta', texto: (f.categoria ? f.categoria.nombre : '') + (f.region ? ' · ' + f.region.nombre : '') }),
          borrar,
        ])
      );
      lista.appendChild(li);
    });
  }

  async function cargarGaleria() {
    try {
      await cargarSelectores();
      await cargarFotos();
    } catch (error) {
      C.aviso($('avisoFoto'), error.message, 'error');
    }
  }

  $('formFoto').addEventListener('submit', async function (e) {
    e.preventDefault();
    var aviso = $('avisoFoto');
    var url = $('foto-url').value.trim();
    var errores = {
      'foto-url': urlSegura(url) ? '' : 'Escribe una dirección https:// o una ruta del sitio que empiece con /imagenes/.',
      'foto-titulo': $('foto-titulo').value.trim().length >= 3 ? '' : 'Escribe un título de al menos 3 caracteres.',
      'foto-categoria': $('foto-categoria').value ? '' : 'Elige un tema.',
    };
    Object.keys(errores).forEach(function (k) { C.marcarError(k, errores[k]); });
    var primero = Object.keys(errores).find(function (k) { return errores[k]; });
    if (primero) { $(primero).focus(); return; }

    var boton = e.target.querySelector('button[type="submit"]');
    await conBoton(boton, 'Agregando…', async function () {
      await C.api('/galeria', {
        metodo: 'POST',
        cuerpo: {
          imagen_url: urlSegura(url),
          titulo: $('foto-titulo').value.trim(),
          descripcion: $('foto-descripcion').value.trim() || null,
          categoria_id: Number($('foto-categoria').value),
          region_id: $('foto-region').value ? Number($('foto-region').value) : null,
        },
      });
      e.target.reset();
      C.aviso(aviso, 'Foto agregada. Ya aparece en la galería.', 'exito');
      await cargarFotos();
    }, aviso);
  });

  /* ---------- Regiones ---------- */
  var CAMPOS_REGION = [
    ['nombre', 'Nombre', 60, false],
    ['departamentos', 'Departamentos', 150, false],
    ['altitud', 'Altura', 40, false],
    ['perfil_taza', 'Perfil de taza (notas separadas por comas)', 200, false],
    ['descripcion', 'Descripción', 600, true],
  ];

  async function cargarRegiones() {
    var contenedor = $('listaRegiones');
    var aviso = $('avisoRegiones');
    contenedor.replaceChildren();
    try {
      var r = await C.api('/regiones', { autenticar: false });
      if (r.data.length === 0) C.aviso(aviso, 'No hay regiones en la base de datos.');
      r.data.forEach(function (region) { contenedor.appendChild(formRegion(region)); });
    } catch (error) {
      C.aviso(aviso, error.message, 'error');
    }
  }

  function formRegion(region) {
    var aviso = $('avisoRegiones');
    var detalles = el('details', { clase: 'admin-item' });
    detalles.appendChild(el('summary', { texto: region.nombre }));
    var form = el('form', { clase: 'formulario', novalidate: '' });
    CAMPOS_REGION.forEach(function (c) {
      var id = 'region-' + region.id + '-' + c[0];
      var entrada = c[3]
        ? el('textarea', { id: id, rows: '4', maxlength: String(c[2]) })
        : el('input', { id: id, type: 'text', maxlength: String(c[2]) });
      entrada.value = region[c[0]] || '';
      form.appendChild(el('div', { clase: 'campo' }, [el('label', { for: id, texto: c[1] }), entrada]));
    });
    var guardar = el('button', { type: 'submit', clase: 'boton', texto: 'Guardar cambios' });
    form.appendChild(el('div', {}, [guardar]));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var cuerpo = { imagen_url: region.imagen_url || null };
      CAMPOS_REGION.forEach(function (c) {
        var valor = form.querySelector('#region-' + region.id + '-' + c[0]).value.trim();
        cuerpo[c[0]] = c[0] === 'nombre' ? valor : (valor || null);
      });
      if (!cuerpo.nombre) { C.aviso(aviso, 'El nombre de la región es obligatorio.', 'error'); return; }
      conBoton(guardar, 'Guardando…', async function () {
        var r = await C.api('/regiones/' + region.id, { metodo: 'PUT', cuerpo: cuerpo });
        region = r.data;
        detalles.querySelector('summary').textContent = region.nombre;
        C.aviso(aviso, 'Región "' + region.nombre + '" actualizada.', 'exito');
      }, aviso);
    });
    detalles.appendChild(form);
    return detalles;
  }

  iniciar();
})();
