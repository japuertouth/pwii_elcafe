/* Café Hondureño · guía "El café": resalta en el índice la sección que se está leyendo */
(function () {
  'use strict';
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.indice a'));
  var secciones = enlaces.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  if (!('IntersectionObserver' in window) || secciones.length === 0) return;

  function marcar(id) {
    enlaces.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) { if (e.isIntersecting) marcar(e.target.id); });
  }, { rootMargin: '-30% 0px -60% 0px' });
  secciones.forEach(function (s) { observador.observe(s); });
  marcar(secciones[0].id);
})();
