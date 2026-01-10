/* ======================================================
   SENSORS VIEW
   - CRUD básico
   - Tabulator + search (patrón devices/sites/tenants)
   - Modal create/edit
   - Confirm delete modal custom
   - ✅ Tenant combo (muestra name, envía id)
   - ✅ Site combo filtrado por tenant seleccionado
   - ✅ Device combo filtrado por site seleccionado (fallback si backend no filtra)
   - ✅ En tabla: tenant/site/device muestran Name (resolviendo por cache)
   - ✅ is_enabled en tabla como iconos pastel (enabled/disabled)
   - ✅ Evitar scrollbar vertical del navegador: altura dinámica (100vh)
   - ✅ page_size=200 en todos los fetch
   ====================================================== */

let _sensorsTableOverlayEl = null;
let _sensorsConfirmModalInstance = null;
let _sensorsTableInstance = null;

// ✅ Cache combos
let _tenantsCacheForSensors = null;
let _sitesByTenantCacheForSensors = new Map();
let _devicesBySiteCacheForSensors = new Map();

// ✅ Mapas id -> name para tabla
let _tenantNameByIdForSensors = new Map();
let _siteNameByIdForSensors = new Map();
let _deviceNameByIdForSensors = new Map();

/* =========================
   Helpers
   ========================= */

function setSensorsTableLoading(isLoading, text = "Cargando...") {
  if (!_sensorsTableOverlayEl) return;
  _sensorsTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _sensorsTableOverlayEl.querySelector("[data-role='label']");
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

function getSensorId(row) {
  return row?.id || row?.sensor_id || row?.sensorId || "";
}

function computeSensorsTableHeight(container) {
  const bottomMargin = 16;
  const tableWrap = container.querySelector("#sensorsTableWrap");
  const rect = tableWrap?.getBoundingClientRect();
  const top = rect ? rect.top : 0;
  return Math.max(320, window.innerHeight - top - bottomMargin);
}

function applySensorsTableHeight(container) {
  if (!_sensorsTableInstance) return;
  _sensorsTableInstance.setHeight(computeSensorsTableHeight(container));
}

/* =========================
   Formatters (tabla)
   ========================= */

function tenantNameFormatterForSensors(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _tenantNameByIdForSensors.get(id) || id;
}

function siteNameFormatterForSensors(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _siteNameByIdForSensors.get(id) || id;
}

function deviceNameFormatterForSensors(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _deviceNameByIdForSensors.get(id) || id;
}

function enabledIconFormatter(cell) {
  const v = !!cell.getValue();
  if (v) {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-toggle-on bo-sensor-enabled" title="enabled"></i>
      </div>
    `;
  }
  return `
    <div class="d-flex justify-content-center bo-status-icon">
      <i class="bi bi-toggle-off bo-sensor-disabled" title="disabled"></i>
    </div>
  `;
}

/* =========================
   Tenants
   ========================= */

async function fetchTenantsForSensorsSelect() {
  if (_tenantsCacheForSensors) return _tenantsCacheForSensors;

  const res = await apiFetch(`/tenants/?page=1&page_size=200`, { method: "GET" });
  const list = Array.isArray(res) ? res : (res?.items || []);

  _tenantsCacheForSensors = list
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || t.id }));

  _tenantNameByIdForSensors = new Map(_tenantsCacheForSensors.map((t) => [t.id, t.name]));
  return _tenantsCacheForSensors;
}

async function fillTenantsSelectForSensors(selectEl, selectedId = "") {
  const tenants = await fetchTenantsForSensorsSelect();

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
   Sites (filtrado por tenant)
   - Usa endpoint nested si existe, fallback a /sites?tenant_id=
   ========================= */

async function fetchSitesForTenantForSensors(tenantId) {
  if (!tenantId) return [];

  if (_sitesByTenantCacheForSensors.has(tenantId)) {
    return _sitesByTenantCacheForSensors.get(tenantId);
  }

  // 1) Intento 1: endpoint "nested" según su ejemplo
  //    /api/v1/sites/{tenantId}/sites?page=1&page_size=200
  try {
    const res = await apiFetch(
      `/sites/${encodeURIComponent(tenantId)}/sites?page=1&page_size=200`,
      { method: "GET" }
    );

    const list = Array.isArray(res) ? res : (res?.items || []);
    const mapped = list
      .filter((s) => s && s.id)
      .map((s) => ({ id: s.id, name: s.name || s.id }));

    _sitesByTenantCacheForSensors.set(tenantId, mapped);

    // (Opcional, pero útil) rellenar mapa para tabla
    for (const s of mapped) _siteNameByIdForSensors.set(s.id, s.name);

    return mapped;
  } catch (e) {
    // Si NO es 404, no hacemos fallback silencioso
    const msg = (e?.message || "").toLowerCase();
    const is404 =
      msg.includes("404") ||
      msg.includes("not found") ||
      msg.includes("no encontrado");

    if (!is404) throw e;
  }

  // 2) Fallback: endpoint clásico por query param
  //    /api/v1/sites/?tenant_id=...&page=1&page_size=200
  const res2 = await apiFetch(
    `/sites/?tenant_id=${encodeURIComponent(tenantId)}&page=1&page_size=200`,
    { method: "GET" }
  );

  const list2 = Array.isArray(res2) ? res2 : (res2?.items || []);
  const mapped2 = list2
    .filter((s) => s && s.id)
    .map((s) => ({ id: s.id, name: s.name || s.id }));

  _sitesByTenantCacheForSensors.set(tenantId, mapped2);

  // (Opcional, pero útil) rellenar mapa para tabla
  for (const s of mapped2) _siteNameByIdForSensors.set(s.id, s.name);

  return mapped2;
}


async function fillSitesSelectForSensors(selectEl, tenantId, selectedSiteId = "") {
  if (!tenantId) {
    selectEl.innerHTML = `<option value="">Seleccione tenant primero</option>`;
    return;
  }

  const sites = await fetchSitesForTenantForSensors(tenantId);

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
   Devices (filtrado por site)
   - Intenta /devices?site_id=... (o /devices?tenant_id=&site_id=)
   - Fallback: trae /devices paginado y filtra cliente
   ========================= */

async function fetchDevicesForSiteForSensors(siteId, tenantId = "") {
  if (!siteId) return [];

  if (_devicesBySiteCacheForSensors.has(siteId)) {
    return _devicesBySiteCacheForSensors.get(siteId);
  }

  // ✅ Nuevo endpoint: devices por site (backend filtra)
  const res = await apiFetch(
    `/devices/${encodeURIComponent(siteId)}/devices?page=1&page_size=200`,
    { method: "GET" }
  );

  const list = Array.isArray(res) ? res : (res?.items || []);

  const mapped = list
    .filter((d) => d && (d.id || d.device_id))
    .map((d) => ({
      id: d.id || d.device_id,
      name: d.name || d.serial || (d.id || d.device_id),
    }));

  _devicesBySiteCacheForSensors.set(siteId, mapped);
  for (const d of mapped) _deviceNameByIdForSensors.set(d.id, d.name);

  return mapped;
}


async function fillDevicesSelectForSensors(selectEl, siteId, tenantId, selectedDeviceId = "") {
  if (!siteId) {
    selectEl.innerHTML = `<option value="">Seleccione site primero</option>`;
    return;
  }

  const devices = await fetchDevicesForSiteForSensors(siteId, tenantId);

  selectEl.innerHTML = `<option value="">(Seleccione device)</option>`;
  for (const d of devices) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    selectEl.appendChild(opt);
  }
  if (selectedDeviceId) selectEl.value = selectedDeviceId;
}

/* =========================
   Confirm modal
   ========================= */

function sensorsConfirmModalHtml() {
  return `
  <div class="modal fade" id="sensorsConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="sensorsConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="sensorsConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="sensorsConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="sensorsConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showSensorsConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("sensorsConfirmModal");
  if (!modalEl) throw new Error("sensorsConfirmModal no está en el DOM");

  document.getElementById("sensorsConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("sensorsConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("sensorsConfirmOk");
  const btnCancel = document.getElementById("sensorsConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _sensorsConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _sensorsConfirmModalInstance.hide();
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
    _sensorsConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderSensorsView(container) {
  // Evita overflow de la vista (sin tocar el body global)
  if (container) container.style.overflow = "hidden";

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Sensors</div>
      <button class="btn btn-primary btn-sm" id="btnCreateSensor">Crear</button>
    </div>

    <div class="mb-3">
      <input
        type="text"
        id="sensorsSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, tenant, site, device, name, sensor_type, unit…"
      />
    </div>

    <div class="bo-table-wrap" id="sensorsTableWrap">
      <div id="sensorsTable"></div>

      <div class="bo-table-overlay d-none" id="sensorsTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${sensorModalHtml()}
    ${sensorsConfirmModalHtml()}
  `;

  _sensorsTableOverlayEl = document.getElementById("sensorsTableOverlay");

  const token = localStorage.getItem("access_token");
  setSensorsTableLoading(true, "Cargando tabla...");

  // Precalentar tenants para mostrar name en tabla
  try {
    await fetchTenantsForSensorsSelect();
  } catch {}

  const tableHeight = computeSensorsTableHeight(container);

  _sensorsTableInstance = new Tabulator("#sensorsTable", {
    height: tableHeight,
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/sensors/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },
      { title: "Tenant", field: "tenant_id", width: 220, formatter: tenantNameFormatterForSensors },
      { title: "Site", field: "site_id", width: 220, formatter: siteNameFormatterForSensors },
      { title: "Device", field: "device_id", width: 240, formatter: deviceNameFormatterForSensors },
      { title: "Name", field: "name", widthGrow: 1 },
      { title: "Type", field: "sensor_type", width: 150 },
      { title: "Unit", field: "unit", width: 110 },

      {
        title: "Enabled",
        field: "is_enabled",
        width: 95,
        hozAlign: "center",
        formatter: enabledIconFormatter,
      },

      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: sensorsActionsFormatter,
        cellClick: onSensorsActionClick,
      },
    ],
  });

  _sensorsTableInstance.on("dataLoading", () => setSensorsTableLoading(true, "Cargando tabla..."));

  _sensorsTableInstance.on("dataLoaded", async (data) => {
    setSensorsTableLoading(false);

    // Precalentar sites/devices según filas cargadas para mostrar nombres
    try {
      const rows = data || [];

      const tenantIds = Array.from(new Set(rows.map((r) => r?.tenant_id).filter(Boolean)));
      for (const tid of tenantIds) {
        const sites = await fetchSitesForTenantForSensors(tid);
        for (const s of sites) _siteNameByIdForSensors.set(s.id, s.name);
      }

      const siteIds = Array.from(new Set(rows.map((r) => r?.site_id).filter(Boolean)));
      for (const sid of siteIds) {
        // tenantId opcional: intentamos inferir desde alguna row
        const sample = rows.find((r) => r?.site_id === sid);
        await fetchDevicesForSiteForSensors(sid, sample?.tenant_id || "");
      }

      _sensorsTableInstance.redraw(true);
    } catch {}
  });

  _sensorsTableInstance.on("dataLoadError", () => setSensorsTableLoading(false, "Error al cargar"));

  window._sensorsTable = _sensorsTableInstance;

  // Ajuste dinámico al redimensionar ventana (evita scrollbar vertical)
  const onResize = () => applySensorsTableHeight(container);
  window.removeEventListener("resize", window.__sensorsResizeHandler || (() => {}));
  window.__sensorsResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  // Search
  const searchInput = document.getElementById("sensorsSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return _sensorsTableInstance.clearFilter();

    _sensorsTableInstance.setFilter((row) => {
      const id = (getSensorId(row) || "").toLowerCase();

      const tenantName = (_tenantNameByIdForSensors.get(row?.tenant_id) || row?.tenant_id || "")
        .toString()
        .toLowerCase();
      const siteName = (_siteNameByIdForSensors.get(row?.site_id) || row?.site_id || "")
        .toString()
        .toLowerCase();
      const deviceName = (_deviceNameByIdForSensors.get(row?.device_id) || row?.device_id || "")
        .toString()
        .toLowerCase();

      const name = (row.name || "").toLowerCase();
      const type = (row.sensor_type || "").toLowerCase();
      const unit = (row.unit || "").toLowerCase();
      const enabled = (row.is_enabled ? "enabled" : "disabled");

      return (
        id.includes(q) ||
        tenantName.includes(q) ||
        siteName.includes(q) ||
        deviceName.includes(q) ||
        name.includes(q) ||
        type.includes(q) ||
        unit.includes(q) ||
        enabled.includes(q)
      );
    });
  });

  document.getElementById("btnCreateSensor").addEventListener("click", () => openSensorModal());
}

function renderSensors(container) {
  return renderSensorsView(container);
}

/* =========================
   Actions
   ========================= */

function sensorsActionsFormatter() {
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

async function onSensorsActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openSensorModal(data);

  if (action === "delete") {
    const ok = await showSensorsConfirm({
      title: "Eliminar Sensor",
      message: `¿Eliminar el sensor "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setSensorsTableLoading(true, "Eliminando...");
      const id = getSensorId(data);
      await apiFetch(`/sensors/${id}`, { method: "DELETE" });
      await window._sensorsTable.replaceData();
    } finally {
      setSensorsTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function sensorModalHtml() {
  return `
  <div class="modal fade" id="sensorModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="sensorModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="sensorFormError" class="alert alert-danger d-none"></div>

          <form id="sensorForm">
            <input type="hidden" id="sensor-id" />

            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label">Tenant</label>
                <select class="form-select" id="sensor-tenant-id" required>
                  <option value="">Cargando tenants...</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Site</label>
                <select class="form-select" id="sensor-site-id" required>
                  <option value="">Seleccione tenant primero</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Device</label>
                <select class="form-select" id="sensor-device-id" required>
                  <option value="">Seleccione site primero</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-4">
                <label class="form-label">Name</label>
                <input class="form-control" id="sensor-name" required />
              </div>

              <div class="col-md-4">
                <label class="form-label">Sensor Type</label>
                <input class="form-control" id="sensor-type" required placeholder="ultrasonic / pressure / ..." />
              </div>

              <div class="col-md-2">
                <label class="form-label">Unit</label>
                <input class="form-control" id="sensor-unit" required placeholder="cm / bar / °C ..." />
              </div>

              <div class="col-md-2">
                <label class="form-label">Enabled</label>
                <select class="form-select" id="sensor-enabled" required>
                  <option value="true">enabled</option>
                  <option value="false">disabled</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <label class="form-label">Calibration JSON</label>
                <textarea class="form-control" id="sensor-calibration" rows="6" placeholder='{"min":0,"max":100}'></textarea>
              </div>

              <div class="col-md-6">
                <label class="form-label">Metadata (JSON)</label>
                <textarea class="form-control" id="sensor-metadata" rows="6"></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveSensor">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openSensorModal(data = null) {
  const errBox = document.getElementById("sensorFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("sensorForm").reset();

  const editId = getSensorId(data);
  document.getElementById("sensor-id").value = editId || "";

  document.getElementById("sensorModalTitle").textContent =
    editId ? "Editar Sensor" : "Crear Sensor";

  // Defaults
  document.getElementById("sensor-enabled").value = "true";

  if (data) {
    document.getElementById("sensor-name").value = data.name || "";
    document.getElementById("sensor-type").value = data.sensor_type || "";
    document.getElementById("sensor-unit").value = data.unit || "";
    document.getElementById("sensor-enabled").value = String(!!data.is_enabled);

    document.getElementById("sensor-calibration").value = data.calibration_json
      ? JSON.stringify(data.calibration_json, null, 2)
      : "";

    document.getElementById("sensor-metadata").value = data.metadata
      ? JSON.stringify(data.metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("sensorModal"),
    { backdrop: "static", keyboard: false }
  );
  modal.show();

  const tenantSelect = document.getElementById("sensor-tenant-id");
  const siteSelect = document.getElementById("sensor-site-id");
  const deviceSelect = document.getElementById("sensor-device-id");

  tenantSelect.disabled = true;
  siteSelect.disabled = true;
  deviceSelect.disabled = true;

  tenantSelect.innerHTML = `<option value="">Cargando tenants...</option>`;
  siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;
  deviceSelect.innerHTML = `<option value="">Seleccione site primero</option>`;

  (async () => {
    try {
      await fillTenantsSelectForSensors(tenantSelect, data?.tenant_id || "");

      const tenantId = tenantSelect.value || "";

      if (tenantId) {
        siteSelect.innerHTML = `<option value="">Cargando sites...</option>`;
        await fillSitesSelectForSensors(siteSelect, tenantId, data?.site_id || "");
      } else {
        siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;
      }

      const siteId = siteSelect.value || "";
      if (siteId) {
        deviceSelect.innerHTML = `<option value="">Cargando devices...</option>`;
        await fillDevicesSelectForSensors(deviceSelect, siteId, tenantId, data?.device_id || "");
      } else {
        deviceSelect.innerHTML = `<option value="">Seleccione site primero</option>`;
      }

      // Cambiar tenant -> recargar sites y resetear devices
      tenantSelect.onchange = async () => {
        const newTenantId = tenantSelect.value || "";

        siteSelect.disabled = true;
        deviceSelect.disabled = true;

        siteSelect.innerHTML = newTenantId
          ? `<option value="">Cargando sites...</option>`
          : `<option value="">Seleccione tenant primero</option>`;

        deviceSelect.innerHTML = `<option value="">Seleccione site primero</option>`;

        try {
          if (newTenantId) {
            await fillSitesSelectForSensors(siteSelect, newTenantId, "");
          }
        } catch (e) {
          siteSelect.innerHTML = `<option value="">Error cargando sites</option>`;
          errBox.textContent = e?.message || "No se pudieron cargar los sites.";
          errBox.classList.remove("d-none");
        } finally {
          siteSelect.disabled = false;
          deviceSelect.disabled = false;
        }
      };

      // Cambiar site -> recargar devices
      siteSelect.onchange = async () => {
        const newTenantId = tenantSelect.value || "";
        const newSiteId = siteSelect.value || "";

        deviceSelect.disabled = true;
        deviceSelect.innerHTML = newSiteId
          ? `<option value="">Cargando devices...</option>`
          : `<option value="">Seleccione site primero</option>`;

        try {
          if (newSiteId) {
            await fillDevicesSelectForSensors(deviceSelect, newSiteId, newTenantId, "");
          }
        } catch (e) {
          deviceSelect.innerHTML = `<option value="">Error cargando devices</option>`;
          errBox.textContent = e?.message || "No se pudieron cargar los devices.";
          errBox.classList.remove("d-none");
        } finally {
          deviceSelect.disabled = false;
        }
      };

    } catch (e) {
      tenantSelect.innerHTML = `<option value="">Error cargando tenants</option>`;
      siteSelect.innerHTML = `<option value="">Error cargando sites</option>`;
      deviceSelect.innerHTML = `<option value="">Error cargando devices</option>`;
      errBox.textContent = e?.message || "No se pudieron cargar tenants/sites/devices.";
      errBox.classList.remove("d-none");
    } finally {
      tenantSelect.disabled = false;
      siteSelect.disabled = false;
      deviceSelect.disabled = false;
    }
  })();

  document.getElementById("btnSaveSensor").onclick = saveSensor;
}

async function saveSensor() {
  const btn = document.getElementById("btnSaveSensor");
  const errBox = document.getElementById("sensorFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("sensor-id").value.trim();

    const tenantId = document.getElementById("sensor-tenant-id").value.trim();
    const siteId = document.getElementById("sensor-site-id").value.trim();
    const deviceId = document.getElementById("sensor-device-id").value.trim();

    const name = document.getElementById("sensor-name").value.trim();
    const sensorType = document.getElementById("sensor-type").value.trim();
    const unit = document.getElementById("sensor-unit").value.trim();
    const isEnabled = document.getElementById("sensor-enabled").value === "true";

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
    if (!deviceId) {
      errBox.textContent = "Device es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!name) {
      errBox.textContent = "Name es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!sensorType) {
      errBox.textContent = "Sensor Type es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }
    if (!unit) {
      errBox.textContent = "Unit es obligatorio.";
      errBox.classList.remove("d-none");
      return;
    }

    const calText = document.getElementById("sensor-calibration").value;
    const cal = safeJsonParse(calText);
    if (cal === "__invalid__") {
      errBox.textContent = "Calibration JSON debe ser JSON válido.";
      errBox.classList.remove("d-none");
      return;
    }

    const mdText = document.getElementById("sensor-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") {
      errBox.textContent = "Metadata debe ser JSON válido.";
      errBox.classList.remove("d-none");
      return;
    }

    const payload = {
      tenant_id: tenantId,
      site_id: siteId,
      device_id: deviceId,
      name,
      sensor_type: sensorType,
      unit,
      calibration_json: cal || {},
      is_enabled: isEnabled,
      metadata: md || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/sensors/${id}` : `/sensors/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    // refrescar mapas por consistencia visual
    try {
      await fetchTenantsForSensorsSelect();
      await fetchSitesForTenantForSensors(tenantId);
      await fetchDevicesForSiteForSensors(siteId, tenantId);
    } catch {}

    bootstrap.Modal.getInstance(document.getElementById("sensorModal")).hide();
    await window._sensorsTable.replaceData();

  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el sensor.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }
}

/* =========================
   Export globals
   ========================= */

window.renderSensorsView = renderSensorsView;
window.renderSensors = renderSensors;
window.renderSensorView = renderSensorsView;

/* ======================================================
   CSS sugerido (añadir a su CSS global)

.bo-app .tabulator .tabulator-cell .bo-status-icon { font-size: 0.95rem; }

.bo-app .tabulator .tabulator-cell .bo-sensor-enabled  { color: #6fcf97 !important; }  // verde pastel
.bo-app .tabulator .tabulator-cell .bo-sensor-disabled { color: #eb8c8c !important; }  // rojo pastel

   ====================================================== */
