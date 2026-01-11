/* ======================================================
   ACTUATORS VIEW
   - CRUD básico
   - Tabulator + search (patrón devices/sites/tenants/sensors)
   - Modal create/edit
   - Confirm delete modal custom
   - ✅ Tenant combo (muestra name, envía id)
   - ✅ Site combo filtrado por tenant (cache + nested + fallback)
   - ✅ Device combo filtrado por site (endpoint dedicado + fallback)
   - ✅ En tabla: tenant/site/device muestran Name (resolviendo por cache)
   - ✅ is_enabled en tabla como iconos pastel (enabled/disabled)
   - ✅ Evitar scrollbar vertical del navegador: altura dinámica (100vh)
   - ✅ page_size=200 en todos los fetch
   ====================================================== */

let _actuatorsTableOverlayEl = null;
let _actuatorsConfirmModalInstance = null;
let _actuatorsTableInstance = null;

// ✅ Cache combos
let _tenantsCacheForActuators = null;
let _sitesByTenantCacheForActuators = new Map();
let _devicesBySiteCacheForActuators = new Map();

// ✅ Mapas id -> name para tabla
let _tenantNameByIdForActuators = new Map();
let _siteNameByIdForActuators = new Map();
let _deviceNameByIdForActuators = new Map();

/* =========================
   Helpers
   ========================= */

function setActuatorsTableLoading(isLoading, text = "Cargando...") {
  if (!_actuatorsTableOverlayEl) return;
  _actuatorsTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _actuatorsTableOverlayEl.querySelector("[data-role='label']");
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

function getActuatorId(row) {
  return row?.id || row?.actuator_id || row?.actuatorId || "";
}

function computeActuatorsTableHeight(container) {
  const bottomMargin = 16;
  const tableWrap = container.querySelector("#actuatorsTableWrap");
  const rect = tableWrap?.getBoundingClientRect();
  const top = rect ? rect.top : 0;
  return Math.max(320, window.innerHeight - top - bottomMargin);
}

function applyActuatorsTableHeight(container) {
  if (!_actuatorsTableInstance) return;
  _actuatorsTableInstance.setHeight(computeActuatorsTableHeight(container));
}

/* =========================
   Formatters (tabla)
   ========================= */

function tenantNameFormatterForActuators(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _tenantNameByIdForActuators.get(id) || id;
}

function siteNameFormatterForActuators(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _siteNameByIdForActuators.get(id) || id;
}

function deviceNameFormatterForActuators(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _deviceNameByIdForActuators.get(id) || id;
}

function enabledIconFormatterForActuators(cell) {
  const v = !!cell.getValue();

  // ✅ IMPORTANTE: usamos bo-sensor-enabled / bo-sensor-disabled
  // para que funcione SU CSS anterior sin tocarlo.
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

async function fetchTenantsForActuatorsSelect() {
  if (_tenantsCacheForActuators) return _tenantsCacheForActuators;

  const res = await apiFetch(`/tenants/?page=1&page_size=200`, { method: "GET" });
  const list = Array.isArray(res) ? res : (res?.items || []);

  _tenantsCacheForActuators = list
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || t.id }));

  _tenantNameByIdForActuators = new Map(_tenantsCacheForActuators.map((t) => [t.id, t.name]));
  return _tenantsCacheForActuators;
}

async function fillTenantsSelectForActuators(selectEl, selectedId = "") {
  const tenants = await fetchTenantsForActuatorsSelect();

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
   - Igual que device_view.js: cache + nested + fallback
   - URL nested según su convención: /sites/{tenantId}/sites
   ========================= */

async function fetchSitesForTenantForActuators(tenantId) {
  if (!tenantId) return [];

  if (_sitesByTenantCacheForActuators.has(tenantId)) {
    return _sitesByTenantCacheForActuators.get(tenantId);
  }

  // 1) Intento endpoint "nested" según su ejemplo
  try {
    const res = await apiFetch(
      `/sites/${encodeURIComponent(tenantId)}/sites?page=1&page_size=200`,
      { method: "GET" }
    );

    const list = Array.isArray(res) ? res : (res?.items || []);
    const mapped = list
      .filter((s) => s && s.id)
      .map((s) => ({ id: s.id, name: s.name || s.id }));

    _sitesByTenantCacheForActuators.set(tenantId, mapped);
    for (const s of mapped) _siteNameByIdForActuators.set(s.id, s.name);

    return mapped;
  } catch (e) {
    const msg = (e?.message || "").toLowerCase();
    const is404 =
      msg.includes("404") ||
      msg.includes("not found") ||
      msg.includes("no encontrado");

    if (!is404) throw e;
  }

  // 2) Fallback: query param
  const res2 = await apiFetch(
    `/sites/?tenant_id=${encodeURIComponent(tenantId)}&page=1&page_size=200`,
    { method: "GET" }
  );

  const list2 = Array.isArray(res2) ? res2 : (res2?.items || []);
  const mapped2 = list2
    .filter((s) => s && s.id)
    .map((s) => ({ id: s.id, name: s.name || s.id }));

  _sitesByTenantCacheForActuators.set(tenantId, mapped2);
  for (const s of mapped2) _siteNameByIdForActuators.set(s.id, s.name);

  return mapped2;
}

async function fillSitesSelectForActuators(selectEl, tenantId, selectedSiteId = "") {
  if (!tenantId) {
    selectEl.innerHTML = `<option value="">Seleccione tenant primero</option>`;
    return;
  }

  const sites = await fetchSitesForTenantForActuators(tenantId);

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
   - Preferencia: endpoint dedicado /devices?site_id=...
   - Fallback: paginado + filtro cliente
   ========================= */

async function fetchDevicesForSiteForActuators(siteId, tenantId = "") {
  if (!siteId) return [];

  if (_devicesBySiteCacheForActuators.has(siteId)) {
    return _devicesBySiteCacheForActuators.get(siteId);
  }

  // ✅ Endpoint filtrado por site (igual que en sensors)
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

  _devicesBySiteCacheForActuators.set(siteId, mapped);

  // ✅ actualizar mapa id->name para tabla
  for (const d of mapped) _deviceNameByIdForActuators.set(d.id, d.name);

  return mapped;
}


async function fillDevicesSelectForActuators(selectEl, siteId, tenantId, selectedDeviceId = "") {
  if (!siteId) {
    selectEl.innerHTML = `<option value="">Seleccione site primero</option>`;
    return;
  }

  const devices = await fetchDevicesForSiteForActuators(siteId, tenantId);

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

function actuatorsConfirmModalHtml() {
  return `
  <div class="modal fade" id="actuatorsConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="actuatorsConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="actuatorsConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="actuatorsConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="actuatorsConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showActuatorsConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("actuatorsConfirmModal");
  if (!modalEl) throw new Error("actuatorsConfirmModal no está en el DOM");

  document.getElementById("actuatorsConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("actuatorsConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("actuatorsConfirmOk");
  const btnCancel = document.getElementById("actuatorsConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _actuatorsConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _actuatorsConfirmModalInstance.hide();
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
    _actuatorsConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderActuatorsView(container) {
  if (container) container.style.overflow = "hidden";

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Actuators</div>
      <button class="btn btn-primary btn-sm" id="btnCreateActuator">Crear</button>
    </div>

    <div class="mb-3">
      <input
        type="text"
        id="actuatorsSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, tenant, site, device, name, type, channel…"
      />
    </div>

    <div class="bo-table-wrap" id="actuatorsTableWrap">
      <div id="actuatorsTable"></div>

      <div class="bo-table-overlay d-none" id="actuatorsTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${actuatorModalHtml()}
    ${actuatorsConfirmModalHtml()}
  `;

  _actuatorsTableOverlayEl = document.getElementById("actuatorsTableOverlay");

  const token = localStorage.getItem("access_token");
  setActuatorsTableLoading(true, "Cargando tabla...");

  try {
    await fetchTenantsForActuatorsSelect();
  } catch {}

  const tableHeight = computeActuatorsTableHeight(container);

  _actuatorsTableInstance = new Tabulator("#actuatorsTable", {
    height: tableHeight,
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/actuators/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },
      { title: "Tenant", field: "tenant_id", width: 220, formatter: tenantNameFormatterForActuators },
      { title: "Site", field: "site_id", width: 220, formatter: siteNameFormatterForActuators },
      { title: "Device", field: "device_id", width: 240, formatter: deviceNameFormatterForActuators },
      { title: "Name", field: "name", widthGrow: 1 },
      { title: "Type", field: "actuator_type", width: 170 },
      { title: "Channel", field: "channel", width: 140 },
      {
        title: "Enabled",
        field: "is_enabled",
        width: 95,
        hozAlign: "center",
        formatter: enabledIconFormatterForActuators,
      },
      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: actuatorsActionsFormatter,
        cellClick: onActuatorsActionClick,
      },
    ],
  });

  _actuatorsTableInstance.on("dataLoading", () => setActuatorsTableLoading(true, "Cargando tabla..."));

  _actuatorsTableInstance.on("dataLoaded", async (data) => {
    setActuatorsTableLoading(false);

    try {
      const rows = data || [];

      const tenantIds = Array.from(new Set(rows.map((r) => r?.tenant_id).filter(Boolean)));
      for (const tid of tenantIds) {
        const sites = await fetchSitesForTenantForActuators(tid);
        for (const s of sites) _siteNameByIdForActuators.set(s.id, s.name);
      }

      const siteIds = Array.from(new Set(rows.map((r) => r?.site_id).filter(Boolean)));
      for (const sid of siteIds) {
        const sample = rows.find((r) => r?.site_id === sid);
        await fetchDevicesForSiteForActuators(sid, sample?.tenant_id || "");
      }

      _actuatorsTableInstance.redraw(true);
    } catch {}
  });

  _actuatorsTableInstance.on("dataLoadError", () => setActuatorsTableLoading(false, "Error al cargar"));

  window._actuatorsTable = _actuatorsTableInstance;

  const onResize = () => applyActuatorsTableHeight(container);
  window.removeEventListener("resize", window.__actuatorsResizeHandler || (() => {}));
  window.__actuatorsResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  const searchInput = document.getElementById("actuatorsSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return _actuatorsTableInstance.clearFilter();

    _actuatorsTableInstance.setFilter((row) => {
      const id = (getActuatorId(row) || "").toLowerCase();

      const tenantName = (_tenantNameByIdForActuators.get(row?.tenant_id) || row?.tenant_id || "")
        .toString()
        .toLowerCase();
      const siteName = (_siteNameByIdForActuators.get(row?.site_id) || row?.site_id || "")
        .toString()
        .toLowerCase();
      const deviceName = (_deviceNameByIdForActuators.get(row?.device_id) || row?.device_id || "")
        .toString()
        .toLowerCase();

      const name = (row.name || "").toLowerCase();
      const type = (row.actuator_type || "").toLowerCase();
      const channel = (row.channel || "").toLowerCase();
      const enabled = (row.is_enabled ? "enabled" : "disabled");

      return (
        id.includes(q) ||
        tenantName.includes(q) ||
        siteName.includes(q) ||
        deviceName.includes(q) ||
        name.includes(q) ||
        type.includes(q) ||
        channel.includes(q) ||
        enabled.includes(q)
      );
    });
  });

  document.getElementById("btnCreateActuator").addEventListener("click", () => openActuatorModal());
}

function renderActuators(container) {
  return renderActuatorsView(container);
}

/* =========================
   Actions
   ========================= */

function actuatorsActionsFormatter() {
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

async function onActuatorsActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openActuatorModal(data);

  if (action === "delete") {
    const ok = await showActuatorsConfirm({
      title: "Eliminar Actuator",
      message: `¿Eliminar el actuator "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setActuatorsTableLoading(true, "Eliminando...");
      const id = getActuatorId(data);
      await apiFetch(`/actuators/${id}`, { method: "DELETE" });
      await window._actuatorsTable.replaceData();
    } finally {
      setActuatorsTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function actuatorModalHtml() {
  return `
  <div class="modal fade" id="actuatorModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="actuatorModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="actuatorFormError" class="alert alert-danger d-none"></div>

          <form id="actuatorForm">
            <input type="hidden" id="actuator-id" />

            <div class="row g-2">
              <div class="col-md-4">
                <label class="form-label">Tenant</label>
                <select class="form-select" id="actuator-tenant-id" required>
                  <option value="">Cargando tenants...</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Site</label>
                <select class="form-select" id="actuator-site-id" required>
                  <option value="">Seleccione tenant primero</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Device</label>
                <select class="form-select" id="actuator-device-id" required>
                  <option value="">Seleccione site primero</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-4">
                <label class="form-label">Name</label>
                <input class="form-control" id="actuator-name" required />
              </div>

              <div class="col-md-4">
                <label class="form-label">Actuator Type</label>
                <input class="form-control" id="actuator-type" required placeholder="relay / valve / ..." />
              </div>

              <div class="col-md-2">
                <label class="form-label">Channel</label>
                <input class="form-control" id="actuator-channel" required placeholder="GPIO26 / CH1 / ..." />
              </div>

              <div class="col-md-2">
                <label class="form-label">Enabled</label>
                <select class="form-select" id="actuator-enabled" required>
                  <option value="true">enabled</option>
                  <option value="false">disabled</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <label class="form-label">State (JSON)</label>
                <textarea class="form-control" id="actuator-state" rows="6" placeholder='{"on":true}'></textarea>
              </div>

              <div class="col-md-6">
                <label class="form-label">Metadata (JSON)</label>
                <textarea class="form-control" id="actuator-metadata" rows="6"></textarea>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveActuator">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openActuatorModal(data = null) {
  const errBox = document.getElementById("actuatorFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("actuatorForm").reset();

  const editId = getActuatorId(data);
  document.getElementById("actuator-id").value = editId || "";

  document.getElementById("actuatorModalTitle").textContent =
    editId ? "Editar Actuator" : "Crear Actuator";

  document.getElementById("actuator-enabled").value = "true";

  if (data) {
    document.getElementById("actuator-name").value = data.name || "";
    document.getElementById("actuator-type").value = data.actuator_type || "";
    document.getElementById("actuator-channel").value = data.channel || "";
    document.getElementById("actuator-enabled").value = String(!!data.is_enabled);

    document.getElementById("actuator-state").value = data.state
      ? JSON.stringify(data.state, null, 2)
      : "";

    document.getElementById("actuator-metadata").value = data.metadata
      ? JSON.stringify(data.metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("actuatorModal"),
    { backdrop: "static", keyboard: false }
  );
  modal.show();

  const tenantSelect = document.getElementById("actuator-tenant-id");
  const siteSelect = document.getElementById("actuator-site-id");
  const deviceSelect = document.getElementById("actuator-device-id");

  tenantSelect.disabled = true;
  siteSelect.disabled = true;
  deviceSelect.disabled = true;

  tenantSelect.innerHTML = `<option value="">Cargando tenants...</option>`;
  siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;
  deviceSelect.innerHTML = `<option value="">Seleccione site primero</option>`;

  (async () => {
    try {
      await fillTenantsSelectForActuators(tenantSelect, data?.tenant_id || "");

      const tenantId = tenantSelect.value || "";

      if (tenantId) {
        siteSelect.innerHTML = `<option value="">Cargando sites...</option>`;
        await fillSitesSelectForActuators(siteSelect, tenantId, data?.site_id || "");
      } else {
        siteSelect.innerHTML = `<option value="">Seleccione tenant primero</option>`;
      }

      const siteId = siteSelect.value || "";
      if (siteId) {
        deviceSelect.innerHTML = `<option value="">Cargando devices...</option>`;
        await fillDevicesSelectForActuators(deviceSelect, siteId, tenantId, data?.device_id || "");
      } else {
        deviceSelect.innerHTML = `<option value="">Seleccione site primero</option>`;
      }

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
            await fillSitesSelectForActuators(siteSelect, newTenantId, "");
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

      siteSelect.onchange = async () => {
        const newTenantId = tenantSelect.value || "";
        const newSiteId = siteSelect.value || "";

        deviceSelect.disabled = true;
        deviceSelect.innerHTML = newSiteId
          ? `<option value="">Cargando devices...</option>`
          : `<option value="">Seleccione site primero</option>`;

        try {
          if (newSiteId) {
            await fillDevicesSelectForActuators(deviceSelect, newSiteId, newTenantId, "");
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

  document.getElementById("btnSaveActuator").onclick = saveActuator;
}

async function saveActuator() {
  const btn = document.getElementById("btnSaveActuator");
  const errBox = document.getElementById("actuatorFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("actuator-id").value.trim();

    const tenantId = document.getElementById("actuator-tenant-id").value.trim();
    const siteId = document.getElementById("actuator-site-id").value.trim();
    const deviceId = document.getElementById("actuator-device-id").value.trim();

    const name = document.getElementById("actuator-name").value.trim();
    const actuatorType = document.getElementById("actuator-type").value.trim();
    const channel = document.getElementById("actuator-channel").value.trim();
    const isEnabled = document.getElementById("actuator-enabled").value === "true";

    if (!tenantId) return showActuatorFormError("Tenant es obligatorio.");
    if (!siteId) return showActuatorFormError("Site es obligatorio.");
    if (!deviceId) return showActuatorFormError("Device es obligatorio.");
    if (!name) return showActuatorFormError("Name es obligatorio.");
    if (!actuatorType) return showActuatorFormError("Actuator Type es obligatorio.");
    if (!channel) return showActuatorFormError("Channel es obligatorio.");

    const stateText = document.getElementById("actuator-state").value;
    const state = safeJsonParse(stateText);
    if (state === "__invalid__") return showActuatorFormError("State debe ser JSON válido.");

    const mdText = document.getElementById("actuator-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") return showActuatorFormError("Metadata debe ser JSON válido.");

    const payload = {
      tenant_id: tenantId,
      site_id: siteId,
      device_id: deviceId,
      name,
      actuator_type: actuatorType,
      channel,
      state: state || {},
      is_enabled: isEnabled,
      metadata: md || null,
    };

    const isEdit = !!id;
    const url = isEdit ? `/actuators/${id}` : `/actuators/`;
    const method = isEdit ? "PATCH" : "POST";

    await apiFetch(url, { method, body: JSON.stringify(payload) });

    try {
      await fetchTenantsForActuatorsSelect();
      await fetchSitesForTenantForActuators(tenantId);
      await fetchDevicesForSiteForActuators(siteId, tenantId);
    } catch {}

    bootstrap.Modal.getInstance(document.getElementById("actuatorModal")).hide();
    await window._actuatorsTable.replaceData();

  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el actuator.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }

  function showActuatorFormError(msg) {
    errBox.textContent = msg;
    errBox.classList.remove("d-none");
    setButtonLoading(btn, false);
    return;
  }
}

/* =========================
   Export globals
   ========================= */

window.renderActuatorsView = renderActuatorsView;
window.renderActuators = renderActuators;
window.renderActuatorView = renderActuatorsView;

/* ======================================================
   CSS sugerido (añadir a su CSS global)

.bo-app .tabulator .tabulator-cell .bo-status-icon { font-size: 0.95rem; }
.bo-app .tabulator .tabulator-cell .bo-actuator-enabled  { color: #6fcf97 !important; }  // verde pastel
.bo-app .tabulator .tabulator-cell .bo-actuator-disabled { color: #eb8c8c !important; }  // rojo pastel

   ====================================================== */
