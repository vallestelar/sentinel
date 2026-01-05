const API_BASE = `${window.location.origin}/api/v1`;

// -------------------------
// Helpers JWT (sin librerías)
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
// LOGIN
// -------------------------
async function login(email, password, tenant) {
  // El backend espera tenant_id
  const payload = {
    tenant_id: tenant,
    email,
    password,
  };

  const res = await fetch(`${API_BASE}/login/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Login inválido");
  }

  const data = await res.json();

  // Sea flexible con el nombre del token
  const token =
    data.access_token ||
    data.token ||
    data.jwt ||
    data.result?.access_token;

  if (!token) {
    throw new Error("No se recibió token en la respuesta del login.");
  }

  // 1) Guardar access token
  localStorage.setItem("access_token", token);

  // 2) Guardar refresh token (si existe)
  if (data.refresh_token) {
    localStorage.setItem("refresh_token", data.refresh_token);
  }

  // 3) Guardar username + tenant
  const payloadJwt = parseJwtPayload(token);

  if (payloadJwt?.username) {
    localStorage.setItem("username", payloadJwt.username);
  }

  // Compatibilidad: JWT antiguo puede traer "company"
  if (payloadJwt?.tenant) {
    localStorage.setItem("tenant", payloadJwt.tenant);
  } else if (payloadJwt?.company) {
    localStorage.setItem("tenant", payloadJwt.company);
  } else {
    // fallback: tenant introducido en login
    localStorage.setItem("tenant", tenant);
  }

  // 4) Guardar id_token si existe
  if (data.id_token) {
    localStorage.setItem("id_token", data.id_token);
  }

  return token;
}

// -------------------------
// LOGOUT
// -------------------------
function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("id_token");
  localStorage.removeItem("username");
  localStorage.removeItem("tenant");

  // Redirección ABSOLUTA (evita /backoffice/login)
  window.location.href = "/login";
}

// -------------------------
// PROTECCIÓN DE RUTAS
// -------------------------
function requireAuthOrRedirect() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = "/login";
  }
}
