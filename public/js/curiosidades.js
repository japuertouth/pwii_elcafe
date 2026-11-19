/* Café Hondureño · curiosidades: dato destacado, lista filtrable y mito o realidad */
(function () {
  'use strict';

  var TEMAS = { economia: 'Economía', historia: 'Historia', cultivo: 'Cultivo', cultura: 'Cultura' };
  var LOCALES = [
    { tema: 'economia', titulo: 'Gigante de Centroamérica', texto: 'Honduras es el mayor productor de café de Centroamérica y uno de los cinco más grandes del mundo.' },
    { tema: 'economia', titulo: 'Un café de pequeños productores', texto: 'Unas 120,000 familias cultivan café en el país, y el 90 % de ellas son pequeños caficultores.' },
    { tema: 'economia', titulo: 'Un millón de empleos', texto: 'Durante la cosecha, el café genera cerca de un millón de empleos entre el corte, el beneficiado y el transporte.' },
    { tema: 'economia', titulo: 'La principal fuente de divisas', texto: 'El café es lo que más dólares aporta a Honduras por exportación. En la cosecha 2024-2025 se superaron los US$2,100 millones.' },
    { tema: 'economia', titulo: 'El quintal pesa 46 kilos', texto: 'El café se vende por quintales de 46 kg. En 2024-2025 se exportaron 6.1 millones de quintales, a un precio promedio cercano a US$360 cada uno.' },
    { tema: 'historia', titulo: 'Llegó hace más de dos siglos', texto: 'Las primeras plantas de café llegaron a Honduras a finales del siglo XVIII, traídas desde otras colonias de la región.' },
    { tema: 'historia', titulo: 'Nace el IHCAFE', texto: 'En 1970 se creó el Instituto Hondureño del Café para organizar la caficultura y apoyar a los productores.' },
    { tema: 'historia', titulo: 'Marcala hizo historia', texto: 'En 2005 el café de Marcala recibió la primera Denominación de Origen para café de Centroamérica.' },
    { tema: 'historia', titulo: 'Superó a Guatemala', texto: 'En 2011 Honduras pasó a Guatemala y se convirtió en el mayor productor de café de la región.' },
    { tema: 'cultivo', titulo: 'La cosecha empieza el 1 de octubre', texto: 'Cada 1 de octubre arranca la nueva cosecha y se celebra el Día Nacional de la Caficultura.' },
    { tema: 'cultivo', titulo: 'Crece en la montaña, bajo sombra', texto: 'El café hondureño es casi todo arábica y se cultiva en zonas altas. En la región de Copán llega hasta los 1,700 metros sobre el nivel del mar.' },
    { tema: 'cultivo', titulo: 'El grano es la semilla de una fruta', texto: 'El café nace dentro de una cereza roja. Normalmente cada cereza guarda dos semillas: los granos que luego se tuestan.' },
    { tema: 'cultivo', titulo: 'Un enemigo llamado roya', texto: 'La roya es un hongo que ataca las hojas del cafeto. Junto con otras plagas y el cambio climático, es uno de los grandes retos del sector.' },
    { tema: 'cultura', titulo: 'Seis regiones, seis sabores', texto: 'Copán, Opalaca, Montecillos, Comayagua, El Paraíso y Agalta tienen perfiles distintos: desde chocolate y caramelo hasta durazno, uva y cítricos.' },
    { tema: 'cultura', titulo: 'Café junto a ruinas mayas', texto: 'La región cafetalera de Copán está cerca de la frontera con Guatemala y de las ruinas mayas de Copán.' },
    { tema: 'cultura', titulo: 'Tamal con cafecito', texto: 'El tamal acompañado de una taza de café caliente es una combinación clásica en las mesas hondureñas, sobre todo en días de fiesta.' },
  ];
  var MITOS = [
    { frase: 'Honduras es el mayor productor de café de Centroamérica.', real: true, resp: 'Lo es desde 2011, cuando superó a Guatemala, y está entre los cinco mayores productores del mundo.' },
    { frase: 'El café hondureño crece a nivel del mar.', real: false, resp: 'Se cultiva en zonas de montaña, aproximadamente entre los 1,000 y los 1,700 metros sobre el nivel del mar.' },
    { frase: 'El grano de café es en realidad la semilla de una fruta.', real: true, resp: 'Cada cereza de café contiene normalmente dos semillas, que son los granos que conocemos.' },
    { frase: 'La cosecha de café empieza el 1 de enero.', real: false, resp: 'Empieza el 1 de octubre, fecha en que se celebra el Día Nacional de la Caficultura.' },
    { frase: 'El café tostado oscuro tiene mucha más cafeína que el claro.', real: false, resp: 'La diferencia es mínima. El tueste cambia el sabor; la cantidad de cafeína depende sobre todo de la especie y de la porción.' },
  ];

  var curiosidades = LOCALES.slice();
  var filtro = 'todas';
  var ultimo = -1;

  function slug(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  /* ---------- Dato destacado ---------- */
  var destacado = document.getElementById('destacado');
  function mostrarOtra() {
    var i;
    do { i = Math.floor(Math.random() * curiosidades.length); } while (i === ultimo && curiosidades.length > 1);
    ultimo = i;
    destacado.classList.add('cambiando');
    setTimeout(function () {
      document.getElementById('destacadoTitulo').textContent = curiosidades[i].titulo;
      document.getElementById('destacadoTexto').textContent = curiosidades[i].texto;
      destacado.classList.remove('cambiando');
    }, 200);
  }
  document.getElementById('botonOtra').addEventListener('click', mostrarOtra);

  /* ---------- Lista filtrable (se construye con textContent: nunca se inserta HTML recibido) ---------- */
  var filtros = document.getElementById('filtrosCuriosidades');
  var lista = document.getElementById('listaCuriosidades');

  function pintarFiltros() {
    filtros.replaceChildren();
    [['todas', 'Todas']].concat(Object.keys(TEMAS).map(function (k) { return [k, TEMAS[k]]; })).forEach(function (op) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = op[1];
      b.setAttribute('aria-pressed', String(op[0] === filtro));
      b.addEventListener('click', function () { filtro = op[0]; pintarFiltros(); pintarLista(); });
      filtros.appendChild(b);
    });
  }

  function pintarLista() {
    var visibles = curiosidades.filter(function (c) { return filtro === 'todas' || c.tema === filtro; });
    lista.replaceChildren();
    visibles.forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'ficha';
      li.dataset.tema = c.tema;
      var tema = document.createElement('span');
      tema.className = 'etiqueta-dato';
      tema.textContent = TEMAS[c.tema] || 'Café';
      var h3 = document.createElement('h3');
      h3.textContent = c.titulo;
      var p = document.createElement('p');
      p.textContent = c.texto;
      li.append(tema, h3, p);
      if (c.autor) {
        var autor = document.createElement('p');
        autor.textContent = 'Compartida por ' + c.autor;
        li.appendChild(autor);
      }
      lista.appendChild(li);
    });
    document.getElementById('resumenCuriosidades').textContent = visibles.length + ' curiosidades';
  }

  /* ---------- Mito o realidad ---------- */
  var mitos = document.getElementById('mitos');
  MITOS.forEach(function (m) {
    var d = document.createElement('details');
    d.className = 'mito';
    var s = document.createElement('summary');
    s.textContent = m.frase;
    var p = document.createElement('p');
    var v = document.createElement('span');
    v.className = 'veredicto ' + (m.real ? 'veredicto--real' : 'veredicto--mito');
    v.textContent = m.real ? 'Realidad. ' : 'Mito. ';
    p.append(v, document.createTextNode(m.resp));
    d.append(s, p);
    mitos.appendChild(d);
  });

  pintarFiltros();
  pintarLista();

  /* ---------- Curiosidades compartidas por la comunidad (API) ---------- */
  if (window.Cafe) {
    window.Cafe.api('/curiosidades?limit=50', { autenticar: false }).then(function (r) {
      var titulos = curiosidades.map(function (c) { return c.titulo.toLowerCase(); });
      var nuevas = (r.data || []).filter(function (c) { return c && c.titulo && titulos.indexOf(String(c.titulo).toLowerCase()) === -1; })
        .map(function (c) {
          var clave = slug(c.categoria && c.categoria.nombre);
          return { tema: TEMAS[clave] ? clave : 'cultura', titulo: c.titulo, texto: c.descripcion, autor: c.autor && c.autor.nombre };
        });
      if (nuevas.length) {
        curiosidades = curiosidades.concat(nuevas);
        document.getElementById('origenDatos').textContent = 'Incluye ' + nuevas.length + ' compartidas por la comunidad.';
        pintarLista();
      }
    }).catch(function () { /* solo datos locales */ });
  }
})();
