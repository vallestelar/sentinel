// const API_BASE = `${window.location.origin}/api/v1`;

// -------------------------
// Helpers JWT (sin libs)
// -------------------------
function parseJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// -------------------------
// Token storage
// -------------------------
function getToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function getUsername() {
  return localStorage.getItem("username");
}

function getCompany() {
  // ✅ Compat: en su app nueva lo guarda como tenant
  return localStorage.getItem("tenant") || localStorage.getItem("company");
}

function setAuthFromLoginResponse(data) {
  // data = { access_token, id_token, refresh_token, ... }
  if (data?.access_token) {
    localStorage.setItem("access_token", data.access_token);

    // Extraer username/company/tenant desde el access_token (JWT)
    const payload = parseJwtPayload(data.access_token);
    if (payload?.username) localStorage.setItem("username", payload.username);

    // ✅ compat
    if (payload?.tenant) localStorage.setItem("tenant", payload.tenant);
    if (payload?.company) localStorage.setItem("company", payload.company);
  }

  if (data?.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }

  // opcional: guardar id_token si lo usa
  if (data?.id_token) {
    localStorage.setItem("id_token", data.id_token);
  }
}

function clearAuthAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("id_token");
  localStorage.removeItem("username");
  localStorage.removeItem("company");
  localStorage.removeItem("tenant"); // ✅ nuevo

  window.location.href = "/backoffice/login";
}

// -------------------------
// Refresh concurrency guard
// -------------------------
let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const username = getUsername();
  const refresh_token = getRefreshToken();
  const tenantOrCompany = getCompany();

  if (!username || !refresh_token || !tenantOrCompany) {
    throw new Error("Faltan datos para refresh (username/refresh_token/company|tenant).");
  }

  refreshPromise = (async () => {
    // ✅ backend probablemente espera company, enviamos company=tenant
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, refresh_token, company: tenantOrCompany }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data?.access_token) localStorage.setItem("access_token", data.access_token);
    if (data?.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);

    if (data?.access_token) {
      const payload = parseJwtPayload(data.access_token);
      if (payload?.username) localStorage.setItem("username", payload.username);
      if (payload?.tenant) localStorage.setItem("tenant", payload.tenant);
      if (payload?.company) localStorage.setItem("company", payload.company);
    }

    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// -------------------------
// apiFetch con refresh + retry
// -------------------------
async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const doRequest = async (hdrs, opts) => {
    return await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: hdrs,
    });
  };

  let res = await doRequest(headers, options);

  // Token expirado → refresh y reintentar 1 vez
  if (res.status === 401 && !options.__retried) {
    try {
      const newToken = await refreshAccessToken();

      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set(
        "Content-Type",
        retryHeaders.get("Content-Type") || "application/json"
      );
      if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);

      const retryOptions = { ...options, __retried: true };
      res = await doRequest(retryHeaders, retryOptions);
    } catch (e) {
      clearAuthAndRedirect();
      return;
    }
  }

  // Si sigue 401 después del refresh → fuera
  if (res.status === 401) {
    clearAuthAndRedirect();
    return;
  }

  // Manejo de errores
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Puede que algunas respuestas no sean JSON
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await res.json();
  return await res.text();
}
