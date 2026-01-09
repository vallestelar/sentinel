/* ======================================================
   DEVICES VIEW
   - CRUD básico
   - Tabulator + search (igual patrón sites/tenants)
   - Modal create/edit
   - Confirm delete modal custom
   - ✅ Tenant combo (muestra name, envía id)
   - ✅ Site combo filtrado por tenant seleccionado (solo sites del tenant elegido)
   - ✅ Status en modal: combo online | offline
   - ✅ Status en tabla: iconos (online/offline)
   - ✅ En tabla: tenant_id y site_id -> se muestran como Name (resolviendo por cache)
   - ✅ Evitar scrollbar vertical del navegador: altura dinámica (100vh)
   - ✅ page_size=200 en todos los fetch
   ====================================================== */

let _devicesTableOverlayEl = null;
let _devicesConfirmModalInstance = null;
let _devicesTableInstance = null;

// ✅ Cache combos
let _tenantsCacheForDevices = null;
let _sitesByTenantCacheForDevices = new Map();

// ✅ Mapas de resolución para tabla (id -> name)
let _tenantNameById = new Map();
let _siteNameById = new Map();

/* =========================
   Helpers
   ========================= */

function setDevicesTableLoading(isLoading, text = "Cargando...") {
  if (!_devicesTableOverlayEl) return;
  _devicesTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _devicesTableOverlayEl.querySelector("[data-role='label']");
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

function normalizeDeviceStatus(val) {
  const s = (val ?? "").toString().trim().toLowerCase();
  if (s === "online") return "online";
  if (s === "offline") return "offline";
  return "";
}

function formatDateOrDash(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function getDeviceId(row) {
  return row?.id || row?.device_id || row?.deviceId || "";
}

/**
 * Evita scrollbar del navegador:
 * Calcula altura disponible y la aplica a Tabulator.
 */
function computeDevicesTableHeight(container) {
  const bottomMargin = 16;
  const tableWrap = container.querySelector("#devicesTableWrap");
  const rect = tableWrap?.getBoundingClientRect();
  const top = rect ? rect.top : 0;
  return Math.max(320, window.innerHeight - top - bottomMargin);
}

function applyDevicesTableHeight(container) {
  if (!_devicesTableInstance) return;
  _devicesTableInstance.setHeight(computeDevicesTableHeight(container));
}

/* =========================
   Status icon formatter (tabla)
   ========================= */

function deviceStatusIconFormatter(cell) {
  const status = normalizeDeviceStatus(cell.getValue());

  if (status === "online") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-wifi bo-status-online" title="online"></i>
      </div>
    `;
  }

  if (status === "offline") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-wifi-off bo-status-offline" title="offline"></i>
      </div>
    `;
  }

  return `
    <div class="d-flex justify-content-center bo-status-icon">
      <i class="bi bi-question-circle bo-status-unknown" title="unknown"></i>
    </div>
  `;
}

/* =========================
   Resolución ID -> Name para tabla
   ========================= */

function tenantNameFormatter(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _tenantNameById.get(id) || id;
}

function siteNameFormatter(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _siteNameById.get(id) || id;
}

/**
 * Precalienta mapa de tenants (id -> name)
 */
async function warmupTenantNameMap() {
  const tenants = await fetchTenantsForDevicesSelect();
  for (const t of tenants) _tenantNameById.set(t.id, t.name);
}

/**
 * A partir de los rows visibles/recibidos:
 * - obtiene tenant_ids únicos
 * - precarga sites por tenant
 * - rellena mapa site_id -> site_name
 * - redibuja tabla para que los formatters muestren nombres
 */
async function warmupSiteNameMapFromRows(rows) {
  if (!rows || !rows.length) return;

  const tenantIds = Array.from(
    new Set(rows.map((r) => r?.tenant_id).filter(Boolean))
  );

  // Cargar sites por tenant y mapear site_id -> name
  for (const tid of tenantIds) {
    const sites = await fetchSitesForTenantSelect(tid);
    for (const s of sites) _siteNameById.set(s.id, s.name);
  }
}

/* =========================
   Tenants combo helpers
   ========================= */

async function fetchTenantsForDevicesSelect() {
  if (_tenantsCacheForDevices) return _tenantsCacheForDevices;

  const res = await apiFetch(`/tenants/?page=1&page_size=200`, { method: "GET" });
  const list = Array.isArray(res) ? res : (res?.items || []);

  _tenantsCacheForDevices = list
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || t.id }));

  return _tenantsCacheForDevices;
}

async function fillTenantsSelect(selectEl, selectedId = "") {
  const tenants = await fetchTenantsForDevicesSelect();

  selectEl.innerHTML = `<option value="">(Seleccione tenant)</option>`;

  for (const t of tenants) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    selectEl.appendChild(opt);
  }

  if (selectedId) selectEl.value = selectedId;
}

/* =========================
   Sites combo helpers (filtrado por tenant)
   ========================= */

async function fetchSitesForTenantSelect(tenantId) {
  if (!tenantId) return [];

  if (_sitesByTenantCacheForDevices.has(tenantId)) {
    return _sitesByTenantCacheForDevices.get(tenantId);
  }

  // 1) Intento ideal: backend filtra por tenant_id
  let res = null;
  try {
    res = await apiFetch(
      `/sites/?page=1&page_size=200&tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "GET" }
    );
  } catch {
    res = null;
  }

  let list = [];
  if (res) {
    list = Array.isArray(res) ? res : (res?.items || []);
  } else {
    // 2) Fallback: traer y filtrar cliente
    const resAll = await apiFetch(`/sites/?page=1&page_size=200`, { method: "GET" });
    const all = Array.isArray(resAll) ? resAll : (resAll?.items || []);
    list = all.filter((s) => (s?.tenant_id || "") === tenantId);
  }

  const mapped = list
    .filter((s) => s && s.id)
    .map((s) => ({ id: s.id, name: s.name || s.id }));

  _sitesByTenantCacheForDevices.set(tenantId, mapped);
  return mapped;
}

async function fillSitesSelect(selectEl, tenantId, selectedSiteId = "") {
  if (!tenantId) {
    selectEl.innerHTML = `<option value="">Seleccione tenant primero</option>`;
    return;
  }

  const sites = await fetchSitesForTenantSelect(tenantId);

  selectEl.innerHTML = `<option value="">(Seleccione site)</option>`;

  for (const s of sites) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    selectEl.appendChild(opt);
  }

  if (selectedSiteId) selectEl.value = selectedSiteId;
}

/* =========================
   Confirm modal
   ========================= */

function devicesConfirmModalHtml() {
  return `
  <div class="modal fade" id="devicesConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="devicesConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="devicesConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="devicesConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="devicesConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showDevicesConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("devicesConfirmModal");
  if (!modalEl) throw new Error("devicesConfirmModal no está en el DOM");

  document.getElementById("devicesConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("devicesConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("devicesConfirmOk");
  const btnCancel = document.getElementById("devicesConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _devicesConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _devicesConfirmModalInstance.hide();
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
    _devicesConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderDevicesView(container) {
  // Evita overflow de la vista (sin tocar el body global)
  if (container) container.style.overflow = "hidden";

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Devices</div>
      <button class="btn btn-primary btn-sm" id="btnCreateDevice">Crear</button>
    </div>

    <div class="mb-3">
      <input
        type="text"
        id="devicesSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, tenant, site, name, device_type, serial, fw_version, status…"
      />
    </div>

    <div class="bo-table-wrap" id="devicesTableWrap">
      <div id="devicesTable"></div>

      <div class="bo-table-overlay d-none" id="devicesTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${deviceModalHtml()}
    ${devicesConfirmModalHtml()}
  `;

  _devicesTableOverlayEl = document.getElementById("devicesTableOverlay");

  const token = localStorage.getItem("access_token");
  setDevicesTableLoading(true, "Cargando tabla...");

  // Precalentar tenants para poder mostrar nombres en tabla
  try {
    await warmupTenantNameMap();
  } catch {
    // Si falla, la tabla seguirá mostrando IDs como fallback
  }

  const tableHeight = computeDevicesTableHeight(container);

  _devicesTableInstance = new Tabulator("#devicesTable", {
    height: tableHeight,
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/devices/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },

      // ✅ Mostrar Name en vez de id
      { title: "Tenant", field: "tenant_id", width: 240, formatter: tenantNameFormatter },
      { title: "Site", field: "site_id", width: 240, formatter: siteNameFormatter },

      { title: "Name", field: "name", widthGrow: 1 },
      { title: "Type", field: "device_type", width: 160 },
      { title: "Serial", field: "serial", width: 170 },
      { title: "FW", field: "fw_version", width: 120 },

      {
        title: "Status",
        field: "status",
        width: 90,
        hozAlign: "center",
        formatter: deviceStatusIconFormatter,
      },

      {
        title: "Last seen",
        field: "last_seen_at",
        width: 190,
        formatter: (cell) => formatDateOrDash(cell.getValue()),
      },

      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: devicesActionsFormatter,
        cellClick: onDevicesActionClick,
      },
    ],
  });

  _devicesTableInstance.on("dataLoading", () =>
    setDevicesTableLoading(true, "Cargando tabla...")
  );

  _devicesTableInstance.on("dataLoaded", async (data) => {
    setDevicesTableLoading(false);

    // Precargar sites (id->name) basados en tenants presentes en los datos cargados
    try {
      await warmupSiteNameMapFromRows(data || []);
      // Redibujar para que se vean los names
      _devicesTableInstance.redraw(true);
    } catch {
      // Si falla, se verán IDs como fallback
    }
  });

  _devicesTableInstance.on("dataLoadError", () =>
    setDevicesTableLoading(false, "Error al cargar")
  );

  window._devicesTable = _devicesTableInstance;

  // Ajuste dinámico al redimensionar ventana (evita scrollbar vertical)
  const onResize = () => applyDevicesTableHeight(container);
  window.removeEventListener("resize", window.__devicesResizeHandler || (() => {}));
  window.__devicesResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  // Search filter
  const searchInput = document.getElementById("devicesSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return _devicesTableInstance.clearFilter();

    _devicesTableInstance.setFilter((row) => {
      const id = (getDeviceId(row) || "").toLowerCase();

      const tenantName = (_tenantNameById.get(row?.tenant_id) || row?.tenant_id || "")
        .toString()
        .toLowerCase();

      const siteName = (_siteNameById.get(row?.site_id) || row?.site_id || "")
        .toString()
        .toLowerCase();

      const name = (row.name || "").toLowerCase();
      const deviceType = (row.device_type || "").toLowerCase();
      const serial = (row.serial || "").toLowerCase();
      const fw = (row.fw_version || "").toLowerCase();
      const status = (row.status || "").toLowerCase();

      return (
        id.includes(q) ||
        tenantName.includes(q) ||
        siteName.includes(q) ||
        name.includes(q) ||
        deviceType.includes(q) ||
        serial.includes(q) ||
        fw.includes(q) ||
        status.includes(q)
      );
    });
  });

  document.getElementById("btnCreateDevice").addEventListener("click", () => openDeviceModal());
}

function renderDevices(container) {
  return renderDevicesView(container);
}

/* =========================
   Actions
   ========================= */

function devicesActionsFormatter() {
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

async function onDevicesActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openDeviceModal(data);

  if (action === "delete") {
    const ok = await showDevicesConfirm({
      title: "Eliminar Device",
      message: `¿Eliminar el device "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setDevicesTableLoading(true, "Eliminando...");
      const id = getDeviceId(data);
      await apiFetch(`/devices/${id}`, { method: "DELETE" });
      await window._devicesTable.replaceData();
    } finally {
      setDevicesTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function deviceModalHtml() {
  return `
  <div class="modal fade" id="deviceModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="deviceModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="deviceFormError" class="alert alert-danger d-none"></div>

          <form id="deviceForm">
            <input type="hidden" id="device-id" />

            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Tenant</label>
                <select class="form-select" id="device-tenant-id" required>
                  <option value="">Cargando tenants...</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">Site</label>
                <select class="form-select" id="device-site-id" required>
                  <option value="">Seleccione tenant primero</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <label class="form-label">Name</label>
                <input class="form-control" id="device-name" required />
              </div>

              <div class="col-md-6">
                <label class="form-label">Device Type</label>
                <input class="form-control" id="device-type" required placeholder="sensor / gateway / ..." />
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <label class="form-label">Serial</label>
                <input class="form-control" id="device-serial" required placeholder="SN-..." />
              </div>

              <div class="col-md-3">
                <label class="form-label">FW Version</label>
                <input class="form-control" id="device-fw" placeholder="1.0.0" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Status</label>
                <select class="form-select" id="device-status" required>
                  <option value="online">online</option>
                  <option value="offline">offline</option>
                </select>
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label">Metadata (JSON)</label>
              <textarea class="form-control" id="device-metadata" rows="4"></textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveDevice">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openDeviceModal(data = null) {
  const errBox = document.getElementById("deviceFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("deviceForm").reset();

  const editId = getDeviceId(data);
  document.getElementById("device-id").value = editId || "";

  document.getElementById("deviceModalTitle").textContent =
    editId ? "Editar Device" : "Crear Device";

  // defaults
  document.getElementById("device-status").value = "offline";

  if (data) {
    document.getElementById("device-name").value = data.name || "";
    document.getElementById("device-type").value = data.device_type || "";
    document.getElementById("device-serial").value = data.serial || "";
    document.getElementById("device-fw").value = data.fw_version || "";

    const st = normalizeDeviceStatus(data.status);
    document.getElementById("device-status").value = st || "offline";

    document.getElementById("device-metadata").value = data.metadata
      ? JSON.stringify(data.metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("deviceModal"),
    { backdrop: "static", keyboard: false }
  );

  modal.show();

  // ✅ combos: tenants + sites filtrados por tenant (SOLO los correspondientes)
  const tenantSelect = document.getElementById("device-tenant-id");
  const siteSelect = document.getElementById("device-site-id");

  tenantSelect.disabled = true;
  siteSelect.disabled = true;

  tenantSelect.innerHTML = `<option value="">Cargando tenants...</option>`;
  siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;

  (async () => {
    try {
      await fillTenantsSelect(tenantSelect, data?.tenant_id || "");

      const tenantId = tenantSelect.value || "";
      if (tenantId) {
        siteSelect.innerHTML = `<option value="">Cargando sites...</option>`;
        await fillSitesSelect(siteSelect, tenantId, data?.site_id || "");
      } else {
        siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;
      }

      // Al cambiar tenant -> recargar SOLO sites de ese tenant
      tenantSelect.onchange = async () => {
        const newTenantId = tenantSelect.value || "";
        siteSelect.disabled = true;

        siteSelect.innerHTML = newTenantId
          ? `<option value="">Cargando sites...</option>`
          : `<option value="">Seleccione tenant primero</option>`;

        try {
          if (newTenantId) {
            await fillSitesSelect(siteSelect, newTenantId, "");
          }
        } catch (e) {
          siteSelect.innerHTML = `<option value="">Error cargando sites</option>`;
          errBox.textContent = e?.message || "No se pudieron cargar los sites.";
          errBox.classList.remove("d-none");
        } finally {
          siteSelect.disabled = false;
        }
      };
    } catch (e) {
      tenantSelect.innerHTML = `<option value="">Error cargando tenants</option>`;
      siteSelect.innerHTML = `<option value="">Error cargando sites</option>`;
      errBox.textContent = e?.message || "No se pudieron cargar tenants/sites.";
      errBox.classList.remove("d-none");
    } finally {
      tenantSelect.disabled = false;
      siteSelect.disabled = false;
    }
  })();

  document.getElementById("btnSaveDevice").onclick = saveDevice;
}

async function saveDevice() {
  const btn = document.getElementById("btnSaveDevice");
  const errBox = document.getElementById("deviceFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("device-id").value.trim();

    const tenantId = document.getElementById("device-tenant-id").value.trim();
    const siteId = document.getElementById("device-site-id").value.trim();
    const name = document.getElementById("device-name").value.trim();
    const deviceType = document.getElementById("device-type").value.trim();
    const serial = document.getElementById("device-serial").value.trim();
    const fwVersion = document.getElementById("device-fw").value.trim();
    const status = normalizeDeviceStatus(document.getElementById("device-status").value);

    if (!tenantId) {
      errBox.textContent = "Tenant es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!siteId) {
      errBox.textContent = "Site es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!name) {
      errBox.textContent = "Name es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!deviceType) {
      errBox.textContent = "Device Type es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!serial) {
      errBox.textContent = "Serial es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!status) {
      errBox.textContent = "Status es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }

    const mdText = document.getElementById("device-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") {
      errBox.textContent = "Metadata debe ser JSON válido.";
      errBox.classList.remove("d-none");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      site_id: siteId,
      name,
      device_type: deviceType,
      serial,
      fw_version: fwVersion || null,
      status,
      metadata: md || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/devices/${id}` : `/devices/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    // Actualizar mapas tras guardar (por si cambió tenant/site)
    try {
      await warmupTenantNameMap();
      await warmupSiteNameMapFromRows([{ tenant_id: tenantId, site_id: siteId }]);
    } catch {}

    bootstrap.Modal.getInstance(document.getElementById("deviceModal")).hide();
    await window._devicesTable.replaceData();
  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el device.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
}

/* =========================
   Export globals
   ========================= */

window.renderDevicesView = renderDevicesView;
window.renderDevices = renderDevices;
window.renderDeviceView = renderDevicesView;

/* ======================================================
   CSS sugerido (añadir a su CSS global)

.bo-status-icon i { font-size: 1.15rem; }

.bo-status-online  { color: #6fcf97; }  // verde pastel
.bo-status-offline { color: #eb8686; }  // rojo pastel
.bo-status-unknown { color: #a9a9a9; }

   ====================================================== */
