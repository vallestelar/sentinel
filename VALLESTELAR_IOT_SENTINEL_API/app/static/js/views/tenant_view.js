/* ======================================================
   TENANTS VIEW
   - CRUD básico
   - Tabulator + search (igual patrón assetsView)
   - Modal create/edit
   - Confirm delete modal custom (igual patrón assetsView)
   - ✅ Status combo: active | suspended
   - ✅ Tabla: icono según status
   ====================================================== */

let _tenantsTableOverlayEl = null;
let _tenantsConfirmModalInstance = null;

/* =========================
   Helpers
   ========================= */

function setTenantsTableLoading(isLoading, text = "Cargando...") {
  if (!_tenantsTableOverlayEl) return;
  _tenantsTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _tenantsTableOverlayEl.querySelector("[data-role='label']");
  if (label) label.textContent = text;
}

function setButtonLoading(btn, isLoading, loadingText = "Guardando...") {
  if (!btn) return;

  if (isLoading) {
    btn.dataset._originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      ${loadingText}
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset._originalText || "Guardar";
    delete btn.dataset._originalText;
  }
}

function safeJsonParse(str) {
  try {
    if (!str || !str.trim()) return null;
    return JSON.parse(str);
  } catch {
    return "__invalid__";
  }
}

function normalizeStatus(val) {
  const s = (val ?? "").toString().trim().toLowerCase();
  if (s === "active") return "active";
  if (s === "suspended") return "suspended";
  return ""; // desconocido / vacío
}

/* =========================
   Status icon formatter
   ========================= */

function tenantStatusIconFormatter(cell) {
  const status = (cell.getValue() || "").toLowerCase();

  if (status === "active") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-check-circle-fill bo-status-active"></i>
      </div>
    `;
  }

  if (status === "suspended") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
       <i class="bi bi-pause-circle-fill bo-status-suspended"></i>
      </div>
    `;
  }

  return `
    <div class="d-flex justify-content-center bo-status-icon">
      <i class="bi bi-question-circle bo-status-unknown"></i>
    </div>
  `;
}


/* =========================
   Confirm modal (igual assetsView)
   ========================= */

function tenantsConfirmModalHtml() {
  return `
  <div class="modal fade" id="tenantsConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="tenantsConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="tenantsConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="tenantsConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="tenantsConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showTenantsConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("tenantsConfirmModal");
  if (!modalEl) throw new Error("tenantsConfirmModal no está en el DOM");

  document.getElementById("tenantsConfirmTitle").textContent =
    title || "Confirmar acción";
  document.getElementById("tenantsConfirmMessage").textContent =
    message || "¿Seguro?";

  const btnOk = document.getElementById("tenantsConfirmOk");
  const btnCancel = document.getElementById("tenantsConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _tenantsConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
    backdrop: true,
    keyboard: true,
    focus: true,
  });

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      btnOk.removeEventListener("click", onOk);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
    };

    const onOk = () => {
      resolved = true;
      cleanup();
      _tenantsConfirmModalInstance.hide();
      resolve(true);
    };

    const onHidden = () => {
      if (!resolved) {
        cleanup();
        resolve(false);
      }
    };

    btnOk.addEventListener("click", onOk);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    _tenantsConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderTenantsView(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Tenants</div>
      <button class="btn btn-primary btn-sm" id="btnCreateTenant">Crear</button>
    </div>

    <!-- ✅ Buscador (igual patrón assetsView) -->
    <div class="mb-3">
      <input
        type="text"
        id="tenantsSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, name, rut, plan, status…"
      />
    </div>

    <div class="bo-table-wrap">
      <div id="tenantsTable"></div>

      <div class="bo-table-overlay d-none" id="tenantsTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${tenantModalHtml()}
    ${tenantsConfirmModalHtml()}
  `;

  _tenantsTableOverlayEl = document.getElementById("tenantsTableOverlay");

  const token = localStorage.getItem("access_token");
  setTenantsTableLoading(true, "Cargando tabla...");

  const table = new Tabulator("#tenantsTable", {
    height: "520px",
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/tenants/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },
      { title: "Name", field: "name", widthGrow: 1 },
      { title: "RUT", field: "rut", width: 140 },
      { title: "Plan", field: "plan", width: 140 },

      // ✅ Icono según status
      {
        title: "Status",
        field: "status",
        width: 90,
        hozAlign: "center",
        formatter: tenantStatusIconFormatter,
      },

      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: tenantsActionsFormatter,
        cellClick: onTenantsActionClick,
      },
    ],
  });

  table.on("dataLoading", () =>
    setTenantsTableLoading(true, "Cargando tabla...")
  );
  table.on("dataLoaded", () => setTenantsTableLoading(false));
  table.on("dataLoadError", () => setTenantsTableLoading(false, "Error al cargar"));

  window._tenantsTable = table;

  // ✅ Search filter (igual patrón assetsView)
  const searchInput = document.getElementById("tenantsSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return table.clearFilter();

    table.setFilter((data) => {
      const id = (data.id || "").toLowerCase();
      const name = (data.name || "").toLowerCase();
      const rut = (data.rut || "").toLowerCase();
      const plan = (data.plan || "").toLowerCase();
      const status = (data.status || "").toLowerCase();

      return (
        id.includes(q) ||
        name.includes(q) ||
        rut.includes(q) ||
        plan.includes(q) ||
        status.includes(q)
      );
    });
  });

  document
    .getElementById("btnCreateTenant")
    .addEventListener("click", () => openTenantModal());
}

/* Alias por si su app llama renderTenants */
function renderTenants(container) {
  return renderTenantsView(container);
}

/* =========================
   Actions (igual assetsView)
   ========================= */

function tenantsActionsFormatter() {
  return `
    <div class="bo-row-actions">
      <button class="bo-action-btn edit" data-action="edit" title="Editar">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="bo-action-btn delete" data-action="delete" title="Eliminar">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;
}

async function onTenantsActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openTenantModal(data);

  if (action === "delete") {
    const ok = await showTenantsConfirm({
      title: "Eliminar Tenant",
      message: `¿Eliminar el tenant "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setTenantsTableLoading(true, "Eliminando...");
      await apiFetch(`/tenants/${data.id}`, { method: "DELETE" });
      await window._tenantsTable.replaceData();
    } finally {
      setTenantsTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function tenantModalHtml() {
  return `
  <div class="modal fade" id="tenantModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="tenantModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="tenantFormError" class="alert alert-danger d-none"></div>

          <form id="tenantForm">
            <input type="hidden" id="tenant-id" />

            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Name</label>
                <input class="form-control" id="tenant-name" required />
              </div>

              <div class="col-md-6">
                <label class="form-label">RUT</label>
                <input class="form-control" id="tenant-rut" />
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-6">
                <label class="form-label">Plan</label>
                <input class="form-control" id="tenant-plan" />
              </div>

              <div class="col-md-6">
                <label class="form-label">Status</label>

                <!-- ✅ Combo status -->
                <select class="form-select" id="tenant-status" required>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label">Metadata (JSON)</label>
              <textarea class="form-control" id="tenant-metadata" rows="4"></textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveTenant">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openTenantModal(data = null) {
  const errBox = document.getElementById("tenantFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("tenantForm").reset();
  document.getElementById("tenant-id").value = data?.id || "";

  document.getElementById("tenantModalTitle").textContent =
    data ? "Editar Tenant" : "Crear Tenant";

  // ✅ defaults
  const statusSelect = document.getElementById("tenant-status");
  statusSelect.value = "active";

  if (data) {
    document.getElementById("tenant-name").value = data.name || "";
    document.getElementById("tenant-rut").value = data.rut || "";
    document.getElementById("tenant-plan").value = data.plan || "";

    // ✅ set status (solo si coincide)
    const st = normalizeStatus(data.status);
    statusSelect.value = st || "active";

    document.getElementById("tenant-metadata").value = data.metadata
      ? JSON.stringify(data.metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("tenantModal"),
    { backdrop: "static", keyboard: false }
  );

  modal.show();
  document.getElementById("btnSaveTenant").onclick = saveTenant;
}

async function saveTenant() {
  const btn = document.getElementById("btnSaveTenant");
  const errBox = document.getElementById("tenantFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("tenant-id").value.trim();

    const payload = {
      name: document.getElementById("tenant-name").value.trim(),
      rut: document.getElementById("tenant-rut").value.trim() || null,
      plan: document.getElementById("tenant-plan").value.trim() || null,
      status: normalizeStatus(document.getElementById("tenant-status").value) || null,
      metadata: null,
    };

    if (!payload.name) {
      errBox.textContent = "Name es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }

    const mdText = document.getElementById("tenant-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") {
      errBox.textContent = "Metadata debe ser JSON válido.";
      errBox.classList.remove("d-none");
      return;
    }
    payload.metadata = md || null;

    const isEdit = !!id;
    const url = isEdit ? `/tenants/${id}` : `/tenants/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    bootstrap.Modal.getInstance(document.getElementById("tenantModal")).hide();
    await window._tenantsTable.replaceData();
  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el tenant.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
}

/* Exponer en global (robusto) */
window.renderTenantsView = renderTenantsView;
window.renderTenants = renderTenants;
