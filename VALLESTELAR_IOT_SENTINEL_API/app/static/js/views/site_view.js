/* ======================================================
   SITES VIEW
   - CRUD básico
   - Tabulator + search (igual patrón assets/tenants)
   - Modal create/edit
   - Confirm delete modal
   - ✅ Tenant combo (muestra name, envía id)
   - ✅ Timezones Chile combo
   - ✅ En tabla: Tenant muestra Name en lugar de tenant_id
   ====================================================== */

let _sitesTableOverlayEl = null;
let _sitesConfirmModalInstance = null;

// ✅ Cache para tenants (para el combo)
let _tenantsCacheForSites = null;

// ✅ Map tenant_id -> tenant_name (para tabla)
let _tenantNameByIdForSites = new Map();

/* =========================
   Helpers
   ========================= */

function setSitesTableLoading(isLoading, text = "Cargando...") {
  if (!_sitesTableOverlayEl) return;
  _sitesTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _sitesTableOverlayEl.querySelector("[data-role='label']");
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

function parseNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : "__invalid__";
}

/* =========================
   Tenants combo helpers
   ========================= */

async function fetchTenantsForSitesSelect() {
  if (_tenantsCacheForSites) return _tenantsCacheForSites;

  // Intento "amable" de pedir más (si el backend ignora params, ok)
  const res = await apiFetch(`/tenants/?page=1&page_size=200`, { method: "GET" });

  const list = Array.isArray(res) ? res : (res?.items || []);
  _tenantsCacheForSites = list
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || t.id }));

  // ✅ Poblar mapa para tabla (id -> name)
  _tenantNameByIdForSites = new Map(
    _tenantsCacheForSites.map((t) => [t.id, t.name])
  );

  return _tenantsCacheForSites;
}

async function fillTenantsSelect(selectEl, selectedId = "") {
  const tenants = await fetchTenantsForSitesSelect();

  selectEl.innerHTML = `<option value="">(Seleccione tenant)</option>`;

  for (const t of tenants) {
    const opt = document.createElement("option");
    opt.value = t.id;       // ✅ value = id (lo que se envía)
    opt.textContent = t.name; // ✅ texto visible = name
    selectEl.appendChild(opt);
  }

  if (selectedId) {
    selectEl.value = selectedId;
  }
}

// ✅ Formatter: mostrar tenant name en la tabla
function tenantNameFormatterForSites(cell) {
  const tenantId = cell.getValue();
  if (!tenantId) return "—";
  return _tenantNameByIdForSites.get(tenantId) || tenantId;
}

/* =========================
   Confirm modal (igual patrón assets)
   ========================= */

function sitesConfirmModalHtml() {
  return `
  <div class="modal fade" id="sitesConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="sitesConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="sitesConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="sitesConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="sitesConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showSitesConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("sitesConfirmModal");
  if (!modalEl) throw new Error("sitesConfirmModal no está en el DOM");

  document.getElementById("sitesConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("sitesConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("sitesConfirmOk");
  const btnCancel = document.getElementById("sitesConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _sitesConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _sitesConfirmModalInstance.hide();
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
    _sitesConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderSitesView(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Sites</div>
      <button class="btn btn-primary btn-sm" id="btnCreateSite">Crear</button>
    </div>

    <!-- Buscador -->
    <div class="mb-3">
      <input
        type="text"
        id="sitesSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, tenant, name, address, timezone…"
      />
    </div>

    <div class="bo-table-wrap">
      <div id="sitesTable"></div>

      <div class="bo-table-overlay d-none" id="sitesTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${siteModalHtml()}
    ${sitesConfirmModalHtml()}
  `;

  _sitesTableOverlayEl = document.getElementById("sitesTableOverlay");

  const token = localStorage.getItem("access_token");
  setSitesTableLoading(true, "Cargando tabla...");

  // ✅ Precalentar tenants para que la tabla muestre name (no id)
  try {
    await fetchTenantsForSitesSelect();
  } catch {
    // si falla, la tabla mostrará el id (fallback)
  }

  const table = new Tabulator("#sitesTable", {
    height: "520px",
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/sites/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },

      // ✅ Tenant muestra nombre
      { title: "Tenant", field: "tenant_id", width: 260, formatter: tenantNameFormatterForSites },

      { title: "Name", field: "name", widthGrow: 1 },
      { title: "Address", field: "address_text", widthGrow: 2 },
      { title: "Timezone", field: "timezone", width: 170 },
      { title: "Lat", field: "lat", width: 110, hozAlign: "right" },
      { title: "Lng", field: "lng", width: 110, hozAlign: "right" },
      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: sitesActionsFormatter,
        cellClick: onSitesActionClick,
      },
    ],
  });

  table.on("dataLoading", () => setSitesTableLoading(true, "Cargando tabla..."));
  table.on("dataLoaded", () => setSitesTableLoading(false));
  table.on("dataLoadError", () => setSitesTableLoading(false, "Error al cargar"));

  window._sitesTable = table;

  // Search filter
  const searchInput = document.getElementById("sitesSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return table.clearFilter();

    table.setFilter((data) => {
      const id = (data.id || "").toLowerCase();

      // ✅ buscar por tenant name o por id (fallback)
      const tenantName = (_tenantNameByIdForSites.get(data.tenant_id) || data.tenant_id || "")
        .toString()
        .toLowerCase();

      const name = (data.name || "").toLowerCase();
      const addr = (data.address_text || "").toLowerCase();
      const tz = (data.timezone || "").toLowerCase();

      return (
        id.includes(q) ||
        tenantName.includes(q) ||
        name.includes(q) ||
        addr.includes(q) ||
        tz.includes(q)
      );
    });
  });

  document.getElementById("btnCreateSite").addEventListener("click", () => openSiteModal());
}

function renderSites(container) {
  return renderSitesView(container);
}

/* =========================
   Actions (igual assets)
   ========================= */

function sitesActionsFormatter() {
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

async function onSitesActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openSiteModal(data);

  if (action === "delete") {
    const ok = await showSitesConfirm({
      title: "Eliminar Site",
      message: `¿Eliminar el site "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setSitesTableLoading(true, "Eliminando...");
      await apiFetch(`/sites/${data.id}`, { method: "DELETE" });
      await window._sitesTable.replaceData();
    } finally {
      setSitesTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function siteModalHtml() {
  return `
  <div class="modal fade" id="siteModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="siteModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="siteFormError" class="alert alert-danger d-none"></div>

          <form id="siteForm">
            <input type="hidden" id="site-id" />

            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Tenant</label>

                <!-- ✅ Combo de Tenants (muestra name, envía id) -->
                <select class="form-select" id="site-tenant-id" required>
                  <option value="">Cargando tenants...</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">Name</label>
                <input class="form-control" id="site-name" required />
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label">Address</label>
              <input class="form-control" id="site-address" />
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-6">
                <label class="form-label">Timezone</label>

                <!-- ✅ Combo Timezones Chile -->
                <select class="form-select" id="site-timezone">
                  <option value="">(Sin timezone)</option>
                  <option value="America/Santiago">America/Santiago (Chile continental)</option>
                  <option value="America/Punta_Arenas">America/Punta_Arenas (Magallanes)</option>
                  <option value="Pacific/Easter">Pacific/Easter (Isla de Pascua)</option>
                </select>
              </div>

              <div class="col-md-3">
                <label class="form-label">Lat</label>
                <input class="form-control" id="site-lat" inputmode="decimal" placeholder="-29.9" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Lng</label>
                <input class="form-control" id="site-lng" inputmode="decimal" placeholder="-71.2" />
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label">Metadata (JSON)</label>
              <textarea class="form-control" id="site-metadata" rows="4"></textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveSite">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openSiteModal(data = null) {
  const errBox = document.getElementById("siteFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("siteForm").reset();
  document.getElementById("site-id").value = data?.id || "";

  document.getElementById("siteModalTitle").textContent =
    data ? "Editar Site" : "Crear Site";

  // ✅ Set fields (except tenant select is loaded async)
  if (data) {
    document.getElementById("site-name").value = data.name || "";
    document.getElementById("site-address").value = data.address_text || "";
    document.getElementById("site-timezone").value = data.timezone || "";
    document.getElementById("site-lat").value = (data.lat ?? "").toString();
    document.getElementById("site-lng").value = (data.lng ?? "").toString();
    document.getElementById("site-metadata").value = data.metadata
      ? JSON.stringify(data.metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("siteModal"),
    { backdrop: "static", keyboard: false }
  );

  modal.show();

  // ✅ Cargar tenants en el combo y seleccionar si estamos editando
  const tenantSelect = document.getElementById("site-tenant-id");
  tenantSelect.disabled = true;
  tenantSelect.innerHTML = `<option value="">Cargando tenants...</option>`;

  (async () => {
    try {
      await fillTenantsSelect(tenantSelect, data?.tenant_id || "");
    } catch (e) {
      tenantSelect.innerHTML = `<option value="">Error cargando tenants</option>`;
      errBox.textContent = e?.message || "No se pudieron cargar los tenants.";
      errBox.classList.remove("d-none");
    } finally {
      tenantSelect.disabled = false;
    }
  })();

  document.getElementById("btnSaveSite").onclick = saveSite;
}

async function saveSite() {
  const btn = document.getElementById("btnSaveSite");
  const errBox = document.getElementById("siteFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("site-id").value.trim();

    // ✅ tenant viene del select (value = UUID)
    const tenantId = document.getElementById("site-tenant-id").value.trim();
    const name = document.getElementById("site-name").value.trim();

    if (!tenantId) {
      errBox.textContent = "Tenant es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!name) {
      errBox.textContent = "Name es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }

    const lat = parseNumberOrNull(document.getElementById("site-lat").value);
    if (lat === "__invalid__") {
      errBox.textContent = "Lat debe ser numérico.";
      errBox.classList.remove("d-none");
      return;
    }

    const lng = parseNumberOrNull(document.getElementById("site-lng").value);
    if (lng === "__invalid__") {
      errBox.textContent = "Lng debe ser numérico.";
      errBox.classList.remove("d-none");
      return;
    }

    const mdText = document.getElementById("site-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") {
      errBox.textContent = "Metadata debe ser JSON válido.";
      errBox.classList.remove("d-none");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      name,
      address_text: document.getElementById("site-address").value.trim() || null,
      timezone: document.getElementById("site-timezone").value.trim() || null,
      lat: lat === null ? null : lat,
      lng: lng === null ? null : lng,
      metadata: md || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/sites/${id}` : `/sites/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    // ✅ refrescar mapa por si cambió el nombre de un tenant (poco probable, pero consistente)
    try { await fetchTenantsForSitesSelect(); } catch {}

    bootstrap.Modal.getInstance(document.getElementById("siteModal")).hide();
    await window._sitesTable.replaceData();

  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el site.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
}

/* Exponer en global */
window.renderSitesView = renderSitesView;
window.renderSites = renderSites;

/* Alias opcional por si su router lo llama distinto */
window.renderSiteView = renderSitesView;
