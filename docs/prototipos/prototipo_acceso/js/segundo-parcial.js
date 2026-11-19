document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-demo-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      window.alert('Prototipo visual: en la aplicación este formulario se envía a la API (POST /api/auth/login o POST /api/auth/registro).');
    });
  });
});
