/* Se carga en <head> sin "defer" para aplicar el tema antes de pintar la página (evita el parpadeo). */
(function () {
  var tema = null;
  try { tema = localStorage.getItem('tema'); } catch (e) { /* almacenamiento no disponible */ }
  if (tema !== 'oscuro' && tema !== 'claro') {
    tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }
  document.documentElement.setAttribute('data-tema', tema);
})();
