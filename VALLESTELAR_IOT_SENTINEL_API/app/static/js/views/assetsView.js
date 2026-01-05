/* ======================================================
   ASSETS VIEW
   - Tabulator + search
   - Modal create/edit (no cierra click fuera ni ESC)
   - Confirm delete modal custom
   - Spinners: overlay tabla + spinner botón guardar
   - Combos: asset_type, area, train_group, parent_asset
   ====================================================== */

// caches maps
//let _assetTypeNameById = null;
let _areaNameById = null;
let _trainGroupKeyById = null;
let _assetLabelById = null; // para parent

// Choices instances
//let _assetTypeChoices = null;
let _areaChoices = null;
let _trainGroupChoices = null;
let _parentAssetChoices = null;

// table overlay el
let _assetsTableOverlayEl = null;
let _assetsConfirmModalInstance = null;

/* =========================
   Helpers
   ========================= */

function fillSelectFromMap(selectEl, map, placeholder = "Seleccione…", allowEmpty = false) {
  selectEl.innerHTML = "";

  if (allowEmpty) {
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— Ninguno —";
    selectEl.appendChild(opt0);
  } else {
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    opt0.disabled = true;
    opt0.selected = true; 
    selectEl.appendChild(opt0);
  }

  const entries = Object.entries(map || {})
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  for (const { id, name } of entries) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    selectEl.appendChild(opt);
  }
}

function setAssetsTableLoading(isLoading, text = "Cargando...") {
  if (!_assetsTableOverlayEl) return;
  _assetsTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _assetsTableOverlayEl.querySelector("[data-role='label']");
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

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  // yyyy-MM-ddTHH:mm
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* =========================
   Load maps
   ========================= */

async function loadAssetTypesMap() {
  if (_assetTypeNameById) return _assetTypeNameById;
  // ⚠️ revise endpoint si es distinto
  const res = await apiFetch("/assetType/", { method: "GET" });
  const items = res?.items || [];

  _assetTypeNameById = {};
  for (const it of items) {
    if (it?.id) _assetTypeNameById[it.id] = it.name || String(it.id).slice(0, 8);
  }
  return _assetTypeNameById;
}

async function loadAreasMap() {
  if (_areaNameById) return _areaNameById;

  const res = await apiFetch("/areas/", { method: "GET" });
  const items = res?.items || [];

  _areaNameById = {};
  for (const it of items) {
    if (it?.id) _areaNameById[it.id] = it.name || String(it.id).slice(0, 8);
  }
  return _areaNameById;
}

async function loadTrainGroupsMap() {
  if (_trainGroupKeyById) return _trainGroupKeyById;

  const res = await apiFetch("/ml_train_groups/", { method: "GET" });
  const items = res?.items || [];

  _trainGroupKeyById = {};
  for (const it of items) {
    if (it?.id) _trainGroupKeyById[it.id] = it.group_key || String(it.id).slice(0, 8);
  }
  return _trainGroupKeyById;
}

async function loadAssetsLabelMap() {
  if (_assetLabelById) return _assetLabelById;

  const res = await apiFetch("/asset/", { method: "GET" });
  const items = res?.items || [];

  _assetLabelById = {};
  for (const it of items) {
    if (!it?.id) continue;
    const label = `${it.name || "Asset"}${it.code ? " (" + it.code + ")" : ""}`;
    _assetLabelById[it.id] = label;
  }
  return _assetLabelById;
}

/* =========================
   Confirm modal
   ========================= */

function assetsConfirmModalHtml() {
  return `
  <div class="modal fade" id="assetsConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="assetsConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="assetsConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="assetsConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="assetsConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showAssetsConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("assetsConfirmModal");
  if (!modalEl) throw new Error("assetsConfirmModal no está en el DOM");

  document.getElementById("assetsConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("assetsConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("assetsConfirmOk");
  const btnCancel = document.getElementById("assetsConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _assetsConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _assetsConfirmModalInstance.hide();
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
    _assetsConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderAssetsView(container) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Assets</div>
      <button class="btn btn-primary btn-sm" id="btnCreateAsset">Crear</button>
    </div>

    <div class="mb-3">
      <input
        type="text"
        id="assetsSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, name, code, type, area, train group, fabricante…"
      />
    </div>

    <div class="bo-table-wrap" id="assetsTableWrap">
      <div id="assetsTable"></div>

      <div class="bo-table-overlay d-none" id="assetsTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${assetModalHtml()}
    ${assetsConfirmModalHtml()}
  `;

  _assetsTableOverlayEl = document.getElementById("assetsTableOverlay");

  // precargar maps (para render de tabla)
  const typeMap = await loadAssetTypesMap();
  const areaMap = await loadAreasMap();
  const tgMap = await loadTrainGroupsMap();

  const token = localStorage.getItem("access_token");
  setAssetsTableLoading(true, "Cargando tabla...");

  const table = new Tabulator("#assetsTable", {
    height: "520px",
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/asset/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: function (url, params, response) {
      return response.items || [];
    },

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },
      { title: "Name", field: "name", widthGrow: 1 },
      { title: "Code", field: "code", width: 140 },

      {
        title: "Type",
        field: "asset_type_id",
        formatter: (cell) => {
          const id = cell.getValue();
          if (!id) return `<span class="text-muted">—</span>`;
          return typeMap?.[id] || `<span class="text-muted">${String(id).slice(0, 8)}…</span>`;
        },
      },

      {
        title: "Area",
        field: "area_id",
        formatter: (cell) => {
          const id = cell.getValue();
          if (!id) return `<span class="text-muted">—</span>`;
          return areaMap?.[id] || `<span class="text-muted">${String(id).slice(0, 8)}…</span>`;
        },
      },

      {
        title: "Train Group",
        field: "ml_train_group_id",
        formatter: (cell) => {
          const id = cell.getValue();
          if (!id) return `<span class="text-muted">—</span>`;
          return tgMap?.[id] || `<span class="text-muted">${String(id).slice(0, 8)}…</span>`;
        },
      },

      { title: "Manufacturer", field: "manufacturer", width: 160 },
      { title: "Model", field: "model", width: 140 },
      { title: "Serial", field: "serial_number", width: 160 },

      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: assetsActionsFormatter,
        cellClick: onAssetsActionClick,
      },
    ],
  });

  table.on("dataLoading", () => setAssetsTableLoading(true, "Cargando tabla..."));
  table.on("dataLoaded", () => setAssetsTableLoading(false));
  table.on("dataLoadError", () => setAssetsTableLoading(false, "Error al cargar"));

  window._assetsTable = table;

  // Search filter (incluye maps)
  const searchInput = document.getElementById("assetsSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return table.clearFilter();

    table.setFilter((data) => {
      const id = (data.id || "").toLowerCase();
      const name = (data.name || "").toLowerCase();
      const code = (data.code || "").toLowerCase();
      const manu = (data.manufacturer || "").toLowerCase();
      const model = (data.model || "").toLowerCase();
      const serial = (data.serial_number || "").toLowerCase();

      const typeName = (typeMap?.[data.asset_type_id] || "").toLowerCase();
      const areaName = (areaMap?.[data.area_id] || "").toLowerCase();
      const tgKey = (tgMap?.[data.ml_train_group_id] || "").toLowerCase();

      return (
        id.includes(q) ||
        name.includes(q) ||
        code.includes(q) ||
        manu.includes(q) ||
        model.includes(q) ||
        serial.includes(q) ||
        typeName.includes(q) ||
        areaName.includes(q) ||
        tgKey.includes(q)
      );
    });
  });

  document.getElementById("btnCreateAsset").addEventListener("click", () => openAssetModal());
}

/* Alias por si su app llama renderAssets */
function renderAssets(container) {
  return renderAssetsView(container);
}

/* =========================
   Actions
   ========================= */

function assetsActionsFormatter() {
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

async function onAssetsActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openAssetModal(data);

  if (action === "delete") {
    const ok = await showAssetsConfirm({
      title: "Eliminar Asset",
      message: `¿Eliminar el asset "${data.name}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setAssetsTableLoading(true, "Eliminando...");
      await apiFetch(`/asset/${data.id}`, { method: "DELETE" });
      await window._assetsTable.replaceData();
    } finally {
      setAssetsTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function assetModalHtml() {
  return `
  <div class="modal fade" id="assetModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="assetModalTitle"></h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="assetFormError" class="alert alert-danger d-none mb-2"></div>

          <form id="assetForm">
            <input type="hidden" id="asset-id" />

            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Name</label>
                <input class="form-control" id="asset-name" required />
              </div>

              <div class="col-md-3">
                <label class="form-label">Code</label>
                <input class="form-control" id="asset-code" required />
              </div>

              <div class="col-md-3">
                <label class="form-label">Criticality</label>
                <input class="form-control" id="asset-criticality" type="number" min="0" step="1" value="0" />
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-4">
                <label class="form-label">Asset Type</label>
                <select class="form-select form-select-sm" id="asset-asset-type-id" required>
                  <option value="" disabled>Seleccione un Asset Type…</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Area</label>
                <select class="form-select form-select-sm" id="asset-area-id" required>
                  <option value="" disabled>Seleccione un Area…</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Train Group</label>
                <select class="form-select form-select-sm" id="asset-train-group-id">
                  <option value="">— Ninguno —</option>
                </select>
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-6">
                <label class="form-label">Parent Asset</label>
                <select class="form-select form-select-sm" id="asset-parent-id">
                  <option value="">— Ninguno —</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">Install Date</label>
                <input class="form-control" id="asset-install-date" type="datetime-local" />
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-md-4">
                <label class="form-label">Manufacturer</label>
                <input class="form-control" id="asset-manufacturer" />
              </div>

              <div class="col-md-4">
                <label class="form-label">Model</label>
                <input class="form-control" id="asset-model" />
              </div>

              <div class="col-md-4">
                <label class="form-label">Serial Number</label>
                <input class="form-control" id="asset-serial-number" />
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-12">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="asset-description" rows="2"></textarea>
              </div>
            </div>

            <div class="row g-2 mt-1">
              <div class="col-12">
                <label class="form-label">Metadata (JSON)</label>
                <textarea class="form-control" id="asset-metadata" rows="4" placeholder='{"key":"value"}'></textarea>
                <div class="text-muted small mt-1">Opcional. Debe ser JSON válido.</div>
              </div>
            </div>

          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveAsset">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open modal + combos
   ========================= */

async function openAssetModal(data = null) {
  const errBox = document.getElementById("assetFormError");
  const showErr = (msg) => {
    errBox.textContent = msg || "Error";
    errBox.classList.remove("d-none");
  };
  const clearErr = () => {
    errBox.textContent = "";
    errBox.classList.add("d-none");
  };

  clearErr();
  document.getElementById("assetForm").reset();

  document.getElementById("assetModalTitle").textContent = data ? "Editar Asset" : "Crear Asset";

  const typeMap = await loadAssetTypesMap();
  const areaMap = await loadAreasMap();
  const tgMap = await loadTrainGroupsMap();
  const assetMap = await loadAssetsLabelMap();

  const typeSel = document.getElementById("asset-asset-type-id");
  const areaSel = document.getElementById("asset-area-id");
  const tgSel = document.getElementById("asset-train-group-id");
  const parentSel = document.getElementById("asset-parent-id");

  fillSelectFromMap(typeSel, typeMap, "Seleccione un Asset Type…", false);
  fillSelectFromMap(areaSel, areaMap, "Seleccione un Area…", false);
  fillSelectFromMap(tgSel, tgMap, "Seleccione un Train Group…", true);
  fillSelectFromMap(parentSel, assetMap, "Seleccione un Parent…", true);

  // destruir choices previos
  for (const c of [_assetTypeChoices, _areaChoices, _trainGroupChoices, _parentAssetChoices]) {
    if (c) c.destroy();
  }
  _assetTypeChoices = _areaChoices = _trainGroupChoices = _parentAssetChoices = null;

  if (window.Choices) {
    _assetTypeChoices = new Choices(typeSel, { searchEnabled: true, shouldSort: false, itemSelectText: "", allowHTML: false });
    _areaChoices = new Choices(areaSel, { searchEnabled: true, shouldSort: false, itemSelectText: "", allowHTML: false });
    _trainGroupChoices = new Choices(tgSel, { searchEnabled: true, shouldSort: false, itemSelectText: "", allowHTML: false });
    _parentAssetChoices = new Choices(parentSel, { searchEnabled: true, shouldSort: false, itemSelectText: "", allowHTML: false });
  }

  if (data) {
    document.getElementById("asset-id").value = data.id || "";
    document.getElementById("asset-name").value = data.name || "";
    document.getElementById("asset-code").value = data.code || "";
    document.getElementById("asset-criticality").value = data.criticality ?? 0;

    document.getElementById("asset-description").value = data.description || "";

    document.getElementById("asset-manufacturer").value = data.manufacturer || "";
    document.getElementById("asset-model").value = data.model || "";
    document.getElementById("asset-serial-number").value = data.serial_number || "";

    document.getElementById("asset-install-date").value = toDatetimeLocalValue(data.install_date);

    const md = data.metadata ? JSON.stringify(data.metadata, null, 2) : "";
    document.getElementById("asset-metadata").value = md;

    const typeId = data.asset_type_id || "";
    const areaId = data.area_id || "";
    const tgId = data.ml_train_group_id || "";
    const parentId = data.parent_id || "";

    if (_assetTypeChoices) _assetTypeChoices.setChoiceByValue(typeId); else typeSel.value = typeId;
    if (_areaChoices) _areaChoices.setChoiceByValue(areaId); else areaSel.value = areaId;
    if (_trainGroupChoices) _trainGroupChoices.setChoiceByValue(tgId || ""); else tgSel.value = tgId || "";
    if (_parentAssetChoices) _parentAssetChoices.setChoiceByValue(parentId || ""); else parentSel.value = parentId || "";
  } else {
    document.getElementById("asset-id").value = "";
    document.getElementById("asset-criticality").value = 0;
  }

  const modalEl = document.getElementById("assetModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl, {
    backdrop: "static",
    keyboard: false,
    focus: true,
  });

  modal.show();
  document.getElementById("btnSaveAsset").onclick = saveAsset;
}

/* =========================
   Save
   ========================= */

async function saveAsset() {
  const btn = document.getElementById("btnSaveAsset");
  const errBox = document.getElementById("assetFormError");

  const showErr = (msg) => {
    errBox.textContent = msg || "Error";
    errBox.classList.remove("d-none");
  };
  const clearErr = () => {
    errBox.textContent = "";
    errBox.classList.add("d-none");
  };

  clearErr();
  setButtonLoading(btn, true, "Guardando...");

  try {
    const id = (document.getElementById("asset-id").value || "").trim();

    const payload = {
      name: document.getElementById("asset-name").value.trim(),
      description: document.getElementById("asset-description").value.trim() || null,
      asset_type_id: (document.getElementById("asset-asset-type-id").value || "").trim(),
      area_id: (document.getElementById("asset-area-id").value || "").trim(),
      ml_train_group_id: (document.getElementById("asset-train-group-id").value || "").trim() || null,
      code: document.getElementById("asset-code").value.trim(),
      parent_id: (document.getElementById("asset-parent-id").value || "").trim() || null,
      manufacturer: document.getElementById("asset-manufacturer").value.trim() || null,
      model: document.getElementById("asset-model").value.trim() || null,
      serial_number: document.getElementById("asset-serial-number").value.trim() || null,
      criticality: Number(document.getElementById("asset-criticality").value || 0),
      updated_by: "system",
    };

    if (!payload.name) return showErr("Name es obligatorio.");
    if (!payload.code) return showErr("Code es obligatorio.");
    if (!payload.asset_type_id) return showErr("Debe seleccionar Asset Type.");
    if (!payload.area_id) return showErr("Debe seleccionar Area.");

    // install_date
    const dt = document.getElementById("asset-install-date").value;
    if (dt) {
      const d = new Date(dt);
      if (!isNaN(d.getTime())) payload.install_date = d.toISOString();
    } else {
      payload.install_date = null;
    }

    // metadata json
    const mdText = document.getElementById("asset-metadata").value;
    const md = safeJsonParse(mdText);
    if (md === "__invalid__") return showErr("Metadata debe ser JSON válido.");
    payload.metadata = md || null;

    const isEdit = !!id;
    if (!isEdit) payload.created_by = "system";

    const url = isEdit ? `/asset/${id}` : `/asset/`;
    const method = isEdit ? "PATCH" : "POST";

    setAssetsTableLoading(true, isEdit ? "Actualizando..." : "Creando...");

    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let msg = "";
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json().catch(() => null);
        msg = j?.detail || j?.message || JSON.stringify(j);
      } else {
        msg = await res.text().catch(() => "");
      }
      if (!msg) msg = `HTTP ${res.status}`;
      return showErr(msg);
    }

    bootstrap.Modal.getInstance(document.getElementById("assetModal")).hide();
    await window._assetsTable.replaceData();

  } finally {
    setAssetsTableLoading(false);
    setButtonLoading(btn, false);
  }
}
