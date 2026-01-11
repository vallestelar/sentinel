document.addEventListener("DOMContentLoaded", () => {
  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", logout);

  const viewTitle = document.getElementById("viewTitle");
  const container = document.getElementById("viewContainer");

  /* =========================
     ROUTER CENTRAL
     ========================= */

  const routes = {
    dashboard: {
      title: "Dashboard",
      render: (c) =>
        typeof renderDashboardView === "function"
          ? renderDashboardView(c)
          : renderPlaceholder(c, "dashboard"),
    },


  sites: {
  title: "Sites",
  render: (c) =>
    typeof renderSitesView === "function"
      ? renderSitesView(c)
      : (typeof renderSites === "function"
          ? renderSites(c)
          : renderPlaceholder(c, "sites")),
    },

    tenants: {
      title: "Tenants",
      render: (c) =>
        typeof renderTenantsView === "function"
          ? renderTenantsView(c)
          : (typeof renderTenants === "function"
              ? renderTenants(c)
              : renderPlaceholder(c, "tenants")),
    },

    devices: {
    title: "Devices",
    render: (c) =>
      typeof renderDevicesView === "function"
        ? renderDevicesView(c)
        : (typeof renderDevices === "function"
            ? renderDevices(c)
            : (typeof renderDeviceView === "function"
                ? renderDeviceView(c)
                : renderPlaceholder(c, "devices"))),
  },
    sensors: {
    title: "Sensors",
    render: (c) =>
      typeof renderSensorsView === "function"
        ? renderSensorsView(c)
        : (typeof renderSensors === "function"
            ? renderSensors(c)
            : (typeof renderSensorView === "function"
                ? renderSensorView(c)
                : renderPlaceholder(c, "sensors"))),
  },
    actuators: {
    title: "Actuators",
    render: (c) =>
      typeof renderActuatorsView === "function"
        ? renderActuatorsView(c)
        : (typeof renderActuators === "function"
            ? renderActuators(c)
            : (typeof renderActuatorView === "function"
                ? renderActuatorView(c)
                : renderPlaceholder(c, "actuators"))),
  },
    users: {
    title: "Users",
    render: (c) =>
      typeof renderUsersView === "function"
        ? renderUsersView(c)
        : (typeof renderUsers === "function"
            ? renderUsers(c)
            : (typeof renderUserView === "function"
                ? renderUserView(c)
                : renderPlaceholder(c, "users"))),
    },

  };

  

  /* =========================
     HELPERS DE NAVEGACIÓN
     ========================= */

  function setActive(btn) {
    document
      .querySelectorAll(".bo-menu-item")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  function navigate(view, btn) {
    const route = routes[view];

    if (btn) setActive(btn);

    if (!route) {
      const title = btn ? btn.innerText.trim() : view;
      if (viewTitle) viewTitle.textContent = title;
      return renderPlaceholder(container, view);
    }

    if (viewTitle) viewTitle.textContent = route.title;
    return route.render(container);
  }

  /* =========================
     MENÚ LATERAL
     ========================= */

  document.querySelectorAll(".bo-menu-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      navigate(view, btn);
    });
  });

  /* =========================
     LOGO → DASHBOARD
     ========================= */

  const sidebarLogo = document.getElementById("sidebarLogo");
  if (sidebarLogo) {
    sidebarLogo.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();

      const dashboardBtn = document.querySelector(
        '.bo-menu-item[data-view="dashboard"]'
      );

      document
        .querySelectorAll(".bo-menu-item")
        .forEach((b) => b.classList.remove("active"));
      if (dashboardBtn) dashboardBtn.classList.add("active");

      if (viewTitle) viewTitle.textContent = "Dashboard";
      return navigate("dashboard", dashboardBtn);
    });
  }

  /* =========================
     ARRANQUE INICIAL
     ========================= */

  const dashboardBtn = document.querySelector(
    '.bo-menu-item[data-view="dashboard"]'
  );

  if (dashboardBtn) {
    dashboardBtn.click();
  } else {
    navigate("dashboard", null);
  }
});

/* =========================
   FALLBACK (único)
   ========================= */

function renderPlaceholder(container, name) {
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-info">
      Vista <b>${name}</b> pendiente de implementar.
    </div>
  `;
}
