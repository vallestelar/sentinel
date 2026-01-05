document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const err = document.getElementById("err");

  const btn = document.getElementById("btnLogin");
  const spinner = document.getElementById("loginSpinner");

  // Si no existe el formulario, no hacemos nada
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    // NO navegar: controlamos el submit vía JS
    e.preventDefault();

    // Limpiar error previo
    err.classList.add("d-none");
    err.textContent = "";

    // Activar spinner y deshabilitar botón
    if (btn && spinner) {
      btn.disabled = true;
      spinner.classList.remove("d-none");
    }

    // Leer valores del formulario
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const tenant = document.getElementById("tenant").value.trim();

    try {
      // Llamada al login (definido en auth.js)
      await login(email, password, tenant);

      // IMPORTANTE:
      // No limpiar inputs ni resetear el form aquí
      // para permitir que el navegador recuerde la contraseña
      window.location.href = "/backoffice";
    } catch (ex) {
      // Mostrar error
      err.textContent = ex?.message || "Error de login";
      err.classList.remove("d-none");

      // Quitar spinner y reactivar botón
      if (btn && spinner) {
        btn.disabled = false;
        spinner.classList.add("d-none");
      }
    }
  });
});
