/* ======================================================
   TENANTS VIEW
   - CRUD básico
   - Tabulator
   - Modal create/edit
   - Confirm delete
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
      <span class="spinner-border spinner-border-sm me-2"></span>
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

/* =========================
   Confirm modal
   ========================= */

function tenantsConfirmModalHtml() {
  return `
  <div class="modal fade" id="tenantsConfirmModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="tenantsConfirmTitle">Confirmar</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="tenantsConfirmMessage">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-danger" id="tenantsConfirmOk">Eliminar</button>
        </div>
      </div>
    </div>
  </div>`;
}

function showTenantsConfirm({ title, message } = {}) {
  const modalEl = document.getElementById("tenantsConfirmModal");
  document.getElementById("tenantsConfirmTitle").textContent = title || "Confirmar";
  document.getElementById("tenantsConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("tenantsConfirmOk");

  _tenantsConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise((resolve) => {
    const onOk = () => {
      btnOk.removeEventListener("click", onOk);
      _tenantsConfirmModalInstance.hide();
      resolve(true);
    };
    btnOk.addEventListener("click", onOk);
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

    <div class="bo-table-wrap">
      <div id="tenantsTable"></div>

      <div class="bo-table-overlay d-none" id="tenantsTableOverlay">
        <div class="bo-table-overlay-card">
          <div class="spinner-border"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${tenantModalHtml()}
    ${tenantsConfirmModalHtml()}
  `;

  _tenantsTableOverlayEl = document.getElementById("tenantsTableOverlay");

  const token = localStorage.getItem("access_token");
  setTenantsTableLoading(true);

  const table = new Tabulator("#tenantsTable", {
    height: "520px",
    layout: "fitColumns",

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
      { title: "Plan", field: "plan", width: 120 },
      { title: "Status", field: "status", width: 120 },
      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: tenantsActionsFormatter,
        cellClick: onTenantsActionClick,
      },
    ],
  });

  table.on("dataLoaded", () => setTenantsTableLoading(false));
  table.on("dataLoadError", () => setTenantsTableLoading(false, "Error"));

  window._tenantsTable = table;

  document.getElementById("btnCreateTenant").onclick = () => openTenantModal();
}

/* =========================
   Actions
   ========================= */

function tenantsActionsFormatter() {
  return `
    <div class="bo-row-actions">
      <button class="bo-action-btn edit" data-action="edit">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="bo-action-btn delete" data-action="delete">
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
    });
    if (!ok) return;

    setTenantsTableLoading(true, "Eliminando...");
    await apiFetch(`/tenants/${data.id}`, { method: "DELETE" });
    await window._tenantsTable.replaceData();
    setTenantsTableLoading(false);
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
                <input class="form-control" id="tenant-status" />
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

  document.getElementById("tenantForm").reset();
  document.getElementById("tenant-id").value = data?.id || "";

  document.getElementById("tenantModalTitle").textContent =
    data ? "Editar Tenant" : "Crear Tenant";

  if (data) {
    document.getElementById("tenant-name").value = data.name || "";
    document.getElementById("tenant-rut").value = data.rut || "";
    document.getElementById("tenant-plan").value = data.plan || "";
    document.getElementById("tenant-status").value = data.status || "";
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

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("tenant-id").value.trim();

    const metadataText = document.getElementById("tenant-metadata").value;
    const metadata = safeJsonParse(metadataText);
    if (metadata === "__invalid__") {
      errBox.textContent = "Metadata debe ser JSON válido";
      errBox.classList.remove("d-none");
      return;
    }

    const payload = {
      name: document.getElementById("tenant-name").value.trim(),
      rut: document.getElementById("tenant-rut").value.trim() || null,
      plan: document.getElementById("tenant-plan").value.trim() || null,
      status: document.getElementById("tenant-status").value.trim() || null,
      metadata: metadata || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/tenants/${id}` : `/tenants/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    bootstrap.Modal.getInstance(document.getElementById("tenantModal")).hide();
    await window._tenantsTable.replaceData();

  } finally {
    setButtonLoading(btn, false);
  }
}

/* Alias */
function renderTenants(container) {
  return renderTenantsView(container);
}
