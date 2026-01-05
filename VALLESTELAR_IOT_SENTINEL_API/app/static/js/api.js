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
  return localStorage.getItem("company");
}

function setAuthFromLoginResponse(data) {
  // data = { access_token, id_token, refresh_token, ... }
  if (data?.access_token) {
    localStorage.setItem("access_token", data.access_token);

    // Extraer username/company desde el access_token (JWT)
    const payload = parseJwtPayload(data.access_token);
    if (payload?.username) localStorage.setItem("username", payload.username);
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
  const company = getCompany();

  if (!username || !refresh_token || !company) {
    throw new Error("Faltan datos para refresh (username/refresh_token/company).");
  }

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, refresh_token, company }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Ajuste estándar: guardar nuevo access_token y refresh_token si viene
    if (data?.access_token) localStorage.setItem("access_token", data.access_token);
    if (data?.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);

    // Recalcular username/company por si cambian (normalmente no)
    if (data?.access_token) {
      const payload = parseJwtPayload(data.access_token);
      if (payload?.username) localStorage.setItem("username", payload.username);
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

  const doRequest = async (hdrs) => {
    return await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: hdrs,
    });
  };

  let res = await doRequest(headers);

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

      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: retryHeaders,
        __retried: true,
      });
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
