/* ======================================================
   USERS VIEW
   - CRUD básico (Tabulator + search + modal + confirm)
   - ✅ CREATE usa /users/onboard (no /users/)
   - ✅ EDIT usa /users/{id} (PATCH)
   - ✅ DELETE usa /users/{id} (DELETE)
   - ✅ Tenant combo (muestra name, envía id) igual patrón sites/devices/sensors
   - ✅ Status en modal: combo (active/suspended)
   - ✅ Status en tabla: iconos pastel (active/suspended) usando clases bo-status-*
   - ✅ Role en modal: combo (user/admin) (si backend soporta más, amplíe)
   - ✅ Evitar scrollbar vertical del navegador: altura dinámica (100vh)
   - ✅ page_size=200 en listados
   ====================================================== */

let _usersTableOverlayEl = null;
let _usersConfirmModalInstance = null;
let _usersTableInstance = null;

// ✅ Tenants cache (para combo y para mostrar name en tabla)
let _tenantsCacheForUsers = null;
let _tenantNameByIdForUsers = new Map();

/* =========================
   Helpers
   ========================= */

function setUsersTableLoading(isLoading, text = "Cargando...") {
  if (!_usersTableOverlayEl) return;
  _usersTableOverlayEl.classList.toggle("d-none", !isLoading);
  const label = _usersTableOverlayEl.querySelector("[data-role='label']");
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

function getUserId(row) {
  return row?.id || row?.user_id || row?.userId || "";
}

function computeUsersTableHeight(container) {
  const bottomMargin = 16;
  const tableWrap = container.querySelector("#usersTableWrap");
  const rect = tableWrap?.getBoundingClientRect();
  const top = rect ? rect.top : 0;
  return Math.max(320, window.innerHeight - top - bottomMargin);
}

function applyUsersTableHeight(container) {
  if (!_usersTableInstance) return;
  _usersTableInstance.setHeight(computeUsersTableHeight(container));
}

/* =========================
   Tenants combo helpers
   ========================= */

async function fetchTenantsForUsersSelect() {
  if (_tenantsCacheForUsers) return _tenantsCacheForUsers;

  const res = await apiFetch(`/tenants/?page=1&page_size=200`, { method: "GET" });
  const list = Array.isArray(res) ? res : (res?.items || []);

  _tenantsCacheForUsers = list
    .filter((t) => t && t.id)
    .map((t) => ({ id: t.id, name: t.name || t.id }));

  _tenantNameByIdForUsers = new Map(_tenantsCacheForUsers.map((t) => [t.id, t.name]));
  return _tenantsCacheForUsers;
}

async function fillTenantsSelectForUsers(selectEl, selectedId = "") {
  const tenants = await fetchTenantsForUsersSelect();

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
   Status formatter (tabla)
   ========================= */

function userStatusIconFormatter(cell) {
  const v = String(cell.getValue() || "").toLowerCase();

  if (v === "active") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-wifi bo-status-active" title="active"></i>
      </div>
    `;
  }
  if (v === "suspended") {
    return `
      <div class="d-flex justify-content-center bo-status-icon">
        <i class="bi bi-wifi-off bo-status-suspended" title="suspended"></i>
      </div>
    `;
  }

  return `
    <div class="d-flex justify-content-center bo-status-icon">
      <i class="bi bi-question-circle bo-status-unknown" title="unknown"></i>
    </div>
  `;
}

function tenantNameFormatterForUsers(cell) {
  const id = cell.getValue();
  if (!id) return "—";
  return _tenantNameByIdForUsers.get(id) || id;
}

/* =========================
   Confirm modal
   ========================= */

function usersConfirmModalHtml() {
  return `
  <div class="modal fade" id="usersConfirmModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bo-confirm-surface">
        <div class="modal-header border-0 pb-1">
          <h5 class="modal-title text-light" id="usersConfirmTitle">Confirmar acción</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body pt-2">
          <div id="usersConfirmMessage" class="bo-confirm-text">¿Seguro?</div>
        </div>
        <div class="modal-footer border-0 pt-1">
          <button type="button" class="btn btn-outline-secondary" id="usersConfirmCancel" data-bs-dismiss="modal">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" id="usersConfirmOk">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
}

function showUsersConfirm({ title, message, okText, cancelText } = {}) {
  const modalEl = document.getElementById("usersConfirmModal");
  if (!modalEl) throw new Error("usersConfirmModal no está en el DOM");

  document.getElementById("usersConfirmTitle").textContent = title || "Confirmar acción";
  document.getElementById("usersConfirmMessage").textContent = message || "¿Seguro?";

  const btnOk = document.getElementById("usersConfirmOk");
  const btnCancel = document.getElementById("usersConfirmCancel");

  btnOk.textContent = okText || "Aceptar";
  btnCancel.textContent = cancelText || "Cancelar";

  _usersConfirmModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl, {
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
      _usersConfirmModalInstance.hide();
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
    _usersConfirmModalInstance.show();
  });
}

/* =========================
   View
   ========================= */

async function renderUsersView(container) {
  if (container) container.style.overflow = "hidden";

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold fs-5">Users</div>
      <button class="btn btn-primary btn-sm" id="btnCreateUser">Crear</button>
    </div>

    <div class="mb-3">
      <input
        type="text"
        id="usersSearch"
        class="form-control form-control-sm"
        placeholder="Buscar por ID, tenant, email, nombre, status, role…"
      />
    </div>

    <div class="bo-table-wrap" id="usersTableWrap">
      <div id="usersTable"></div>

      <div class="bo-table-overlay d-none" id="usersTableOverlay" aria-live="polite">
        <div class="bo-table-overlay-card">
          <div class="spinner-border" role="status" aria-hidden="true"></div>
          <div class="mt-2 small text-muted" data-role="label">Cargando...</div>
        </div>
      </div>
    </div>

    ${userModalHtml()}
    ${usersConfirmModalHtml()}
  `;

  _usersTableOverlayEl = document.getElementById("usersTableOverlay");

  const token = localStorage.getItem("access_token");
  setUsersTableLoading(true, "Cargando tabla...");

  // Precalentar tenants (para mostrar name)
  try {
    await fetchTenantsForUsersSelect();
  } catch {}

  const tableHeight = computeUsersTableHeight(container);

  _usersTableInstance = new Tabulator("#usersTable", {
    height: tableHeight,
    layout: "fitColumns",
    resizableColumnFit: true,
    columnMinWidth: 90,

    ajaxURL: `${API_BASE}/users/`,
    ajaxConfig: {
      method: "GET",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    },

    ajaxResponse: (_, __, response) => response.items || [],

    pagination: true,
    paginationSize: 10,

    columns: [
      { title: "ID", field: "id", width: 260 },
      { title: "Tenant", field: "tenant_id", width: 220, formatter: tenantNameFormatterForUsers },
      { title: "Email", field: "email", widthGrow: 2 },
      { title: "Full Name", field: "full_name", widthGrow: 2 },
      { title: "Role", field: "role", width: 130 },
      { title: "Status", field: "status", width: 90, hozAlign: "center", formatter: userStatusIconFormatter },
      {
        title: "Acciones",
        headerSort: false,
        width: 120,
        formatter: usersActionsFormatter,
        cellClick: onUsersActionClick,
      },
    ],
  });

  _usersTableInstance.on("dataLoading", () => setUsersTableLoading(true, "Cargando tabla..."));
  _usersTableInstance.on("dataLoaded", () => setUsersTableLoading(false));
  _usersTableInstance.on("dataLoadError", () => setUsersTableLoading(false, "Error al cargar"));

  window._usersTable = _usersTableInstance;

  const onResize = () => applyUsersTableHeight(container);
  window.removeEventListener("resize", window.__usersResizeHandler || (() => {}));
  window.__usersResizeHandler = onResize;
  window.addEventListener("resize", onResize);

  const searchInput = document.getElementById("usersSearch");
  searchInput.addEventListener("input", () => {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return _usersTableInstance.clearFilter();

    _usersTableInstance.setFilter((row) => {
      const id = (getUserId(row) || "").toLowerCase();
      const tenantName = (_tenantNameByIdForUsers.get(row?.tenant_id) || row?.tenant_id || "")
        .toString()
        .toLowerCase();
      const email = (row.email || "").toLowerCase();
      const fullName = (row.full_name || "").toLowerCase();
      const role = (row.role || "").toLowerCase();
      const status = (row.status || "").toLowerCase();

      return (
        id.includes(q) ||
        tenantName.includes(q) ||
        email.includes(q) ||
        fullName.includes(q) ||
        role.includes(q) ||
        status.includes(q)
      );
    });
  });

  document.getElementById("btnCreateUser").addEventListener("click", () => openUserModal());
}

function renderUsers(container) {
  return renderUsersView(container);
}

/* =========================
   Actions
   ========================= */

function usersActionsFormatter() {
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

async function onUsersActionClick(e, cell) {
  const btn = e.target.closest("button");
  const action = btn?.dataset.action;
  if (!action) return;

  const data = cell.getRow().getData();

  if (action === "edit") return openUserModal(data);

  if (action === "delete") {
    const ok = await showUsersConfirm({
      title: "Eliminar Usuario",
      message: `¿Eliminar el usuario "${data.email}"?`,
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      setUsersTableLoading(true, "Eliminando...");
      const id = getUserId(data);
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      await window._usersTable.replaceData();
    } finally {
      setUsersTableLoading(false);
    }
  }
}

/* =========================
   Modal
   ========================= */

function userModalHtml() {
  return `
  <div class="modal fade" id="userModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
      <div class="modal-content bo-surface">
        <div class="modal-header">
          <h5 class="modal-title" id="userModalTitle"></h5>
          <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <div id="userFormError" class="alert alert-danger d-none"></div>

          <form id="userForm">
            <input type="hidden" id="user-id" />

            <div class="row g-2">
              <div class="col-md-6">
                <label class="form-label">Tenant</label>
                <select class="form-select" id="user-tenant-id" required>
                  <option value="">Cargando tenants...</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input class="form-control" id="user-email" type="email" required />
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-6">
                <label class="form-label">Password</label>
                <input class="form-control" id="user-password" type="password" placeholder="(solo al crear)" />
                <div class="form-text">En edición, deje vacío para no cambiarla.</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">Full Name</label>
                <input class="form-control" id="user-full-name" required />
              </div>
            </div>

            <div class="row g-2 mt-2">
              <div class="col-md-4">
                <label class="form-label">Status</label>
                <select class="form-select" id="user-status" required>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">Role</label>
                <select class="form-select" id="user-role" required>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div class="col-md-4">
                <label class="form-label">User Metadata (JSON)</label>
                <textarea class="form-control" id="user-metadata" rows="4"></textarea>
              </div>
            </div>

            <div class="mt-2">
              <label class="form-label">Membership Metadata (JSON)</label>
              <textarea class="form-control" id="membership-metadata" rows="4"></textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveUser">Guardar</button>
        </div>
      </div>
    </div>
  </div>
  `;
}

/* =========================
   Open / Save
   ========================= */

function openUserModal(data = null) {
  const errBox = document.getElementById("userFormError");
  errBox.classList.add("d-none");
  errBox.textContent = "";

  document.getElementById("userForm").reset();

  const editId = getUserId(data);
  document.getElementById("user-id").value = editId || "";

  document.getElementById("userModalTitle").textContent =
    editId ? "Editar Usuario" : "Crear Usuario";

  // Defaults
  document.getElementById("user-status").value = "active";
  document.getElementById("user-role").value = "user";

  // Fields
  if (data) {
    document.getElementById("user-email").value = data.email || "";
    document.getElementById("user-full-name").value = data.full_name || "";
    document.getElementById("user-status").value = data.status || "active";
    document.getElementById("user-role").value = data.role || "user";

    document.getElementById("user-metadata").value = data.user_metadata
      ? JSON.stringify(data.user_metadata, null, 2)
      : "";
    document.getElementById("membership-metadata").value = data.membership_metadata
      ? JSON.stringify(data.membership_metadata, null, 2)
      : "";
  }

  const modal = bootstrap.Modal.getOrCreateInstance(
    document.getElementById("userModal"),
    { backdrop: "static", keyboard: false }
  );
  modal.show();

  const tenantSelect = document.getElementById("user-tenant-id");
  tenantSelect.disabled = true;
  tenantSelect.innerHTML = `<option value="">Cargando tenants...</option>`;

  (async () => {
    try {
      await fillTenantsSelectForUsers(tenantSelect, data?.tenant_id || "");
    } catch (e) {
      tenantSelect.innerHTML = `<option value="">Error cargando tenants</option>`;
      errBox.textContent = e?.message || "No se pudieron cargar los tenants.";
      errBox.classList.remove("d-none");
    } finally {
      tenantSelect.disabled = false;
    }
  })();

  document.getElementById("btnSaveUser").onclick = saveUser;
}

async function saveUser() {
  const btn = document.getElementById("btnSaveUser");
  const errBox = document.getElementById("userFormError");

  errBox.classList.add("d-none");
  errBox.textContent = "";

  setButtonLoading(btn, true);

  try {
    const id = document.getElementById("user-id").value.trim();

    const tenantId = document.getElementById("user-tenant-id").value.trim();
    const email = document.getElementById("user-email").value.trim();
    const password = document.getElementById("user-password").value; // puede estar vacío en edición
    const fullName = document.getElementById("user-full-name").value.trim();
    const status = document.getElementById("user-status").value.trim();
    const role = document.getElementById("user-role").value.trim();

    if (!tenantId) return showUserFormError("Tenant es obligatorio.");
    if (!email) return showUserFormError("Email es obligatorio.");
    if (!fullName) return showUserFormError("Full Name es obligatorio.");

    const userMdText = document.getElementById("user-metadata").value;
    const userMd = safeJsonParse(userMdText);
    if (userMd === "__invalid__") return showUserFormError("User Metadata debe ser JSON válido.");

    const memMdText = document.getElementById("membership-metadata").value;
    const memMd = safeJsonParse(memMdText);
    if (memMd === "__invalid__") return showUserFormError("Membership Metadata debe ser JSON válido.");

    const isEdit = !!id;

    // ✅ CREATE usa /users/onboard
    // ✅ EDIT usa /users/{id}
    let url = "";
    let method = "";

    if (!isEdit) {
      // Create (onboard)
      if (!password) return showUserFormError("Password es obligatorio al crear.");
      url = `/users/onboard`;
      method = "POST";
    } else {
      url = `/users/${id}`;
      method = "PATCH";
    }

    const payload = {
      tenant_id: tenantId,
      email,
      full_name: fullName,
      status,
      role,
      user_metadata: userMd || null,
      membership_metadata: memMd || null,
    };

    // Solo enviar password si viene relleno
    if (!isEdit || (password && password.trim())) {
      payload.password = password;
    }

    await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    bootstrap.Modal.getInstance(document.getElementById("userModal")).hide();
    await window._usersTable.replaceData();

  } catch (e) {
    errBox.textContent = e?.message || "No se pudo guardar el usuario.";
    errBox.classList.remove("d-none");
  } finally {
    setButtonLoading(btn, false);
  }

  function showUserFormError(msg) {
    errBox.textContent = msg;
    errBox.classList.remove("d-none");
    setButtonLoading(btn, false);
    return;
  }
}

/* =========================
   Export globals
   ========================= */

window.renderUsersView = renderUsersView;
window.renderUsers = renderUsers;
window.renderUserView = renderUsersView;

/* ======================================================
   CSS (ya lo tiene para tenants/device status, reutilizable)

.bo-app .tabulator .tabulator-cell .bo-status-icon { font-size: 0.95rem; }
.bo-app .tabulator .tabulator-cell .bo-status-active { color: #6fcf97 !important; }
.bo-app .tabulator .tabulator-cell .bo-status-suspended { color: #eb8c8c !important; }
.bo-app .tabulator .tabulator-cell .bo-status-unknown { color: #9bb6d6 !important; opacity: 0.75; }

   ====================================================== */
