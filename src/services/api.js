const baseUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://orange-bison-917444.hostingersite.com/Backend/public"
    : "http://localhost/Favareto/Backend/public/index.php");
const debugEnabled = String(import.meta.env.VITE_DEBUG || "true") === "true";

function debugLog(...args) {
  if (debugEnabled) {
    console.debug("[API]", ...args);
  }
}

function normalizeToken(token) {
  if (!token) return "";
  if (token === "null" || token === "undefined") return "";
  return token;
}

function toFormBody(body) {
  const params = new URLSearchParams();
  if (body && typeof body === "object") {
    Object.entries(body).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value) || (value && typeof value === "object")) {
        params.append(key, JSON.stringify(value));
        return;
      }
      params.append(key, String(value));
    });
  }
  return params.toString();
}

function parseJsonSafe(text) {
  let cleaned = text || "";
  while (cleaned && cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith("\ufeff")) {
    cleaned = cleaned.replace(/^\ufeff+/, "");
  }
  try {
    return cleaned ? JSON.parse(cleaned) : {};
  } catch {
    return {};
  }
}

async function parseResponse(response) {
  const text = await response.text();
  const data = parseJsonSafe(text);
  debugLog("Response", response.url, response.status, data || text, text);
  if (!response.ok) {
    if (data && typeof data.error === "string") {
      throw new Error(data.error);
    }
    throw new Error("Erro na requisicao");
  }
  if (!data || Object.keys(data).length === 0) {
    return text ? { message: text } : {};
  }
  return data;
}

export async function apiGet(path) {
  debugLog("GET", `${baseUrl}${path}`);
  const response = await fetch(`${baseUrl}${path}`);
  return parseResponse(response);
}

export async function apiGetAuth(path, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("GET", `${baseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("GET", `${baseUrl}${path}`, "Bearer", safeToken.slice(0, 8) + "...");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      // Some hosts/proxies drop Authorization; send a secondary header too.
      Authorization: `Bearer ${safeToken}`,
      "X-Auth-Token": safeToken
    }
  });
  return parseResponse(response);
}

export async function apiPost(path, body) {
  debugLog("POST", `${baseUrl}${path}`, body);
  const payload = toFormBody(body);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: payload
  });
  return parseResponse(response);
}

export async function apiPostAuth(path, body, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("POST", `${baseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("POST", `${baseUrl}${path}`, body, "Bearer", safeToken.slice(0, 8) + "...");
  const payload = toFormBody(body);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Authorization: `Bearer ${safeToken}`,
      "X-Auth-Token": safeToken
    },
    body: payload
  });
  return parseResponse(response);
}

export async function apiPutAuth(path, body, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("PUT", `${baseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("PUT", `${baseUrl}${path}`, body, "Bearer", safeToken.slice(0, 8) + "...");
  const payload = toFormBody(body);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Authorization: `Bearer ${safeToken}`,
      "X-Auth-Token": safeToken
    },
    body: payload
  });
  return parseResponse(response);
}

export async function apiDeleteAuth(path, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("DELETE", `${baseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("DELETE", `${baseUrl}${path}`, "Bearer", safeToken.slice(0, 8) + "...");
  const response = await fetch(`${baseUrl}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${safeToken}`,
      "X-Auth-Token": safeToken
    }
  });
  return parseResponse(response);
}

export async function apiUpload(file, token) {
  const safeToken = normalizeToken(token);
  debugLog("UPLOAD admin", file?.name, safeToken ? safeToken.slice(0, 8) + "..." : "TOKEN AUSENTE");
  const body = new FormData();
  body.append("file", file);
  // Alguns ambientes Apache/XAMPP podem nao repassar Authorization em multipart.
  // O backend aceita token via campo do formulario tambem (token).
  if (safeToken) body.append("token", safeToken);
  const response = await fetch(`${baseUrl}/api/uploads`, {
    method: "POST",
    headers: safeToken
      ? { Authorization: `Bearer ${safeToken}`, "X-Auth-Token": safeToken }
      : {},
    body
  });
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (!response.ok) {
    throw new Error(data.error || "Falha no upload");
  }
  if (!data.url) {
    throw new Error(data.error || "Resposta invalida no upload");
  }
  return data;
}

export async function apiUploadUser(file, token) {
  const safeToken = normalizeToken(token);
  debugLog("UPLOAD user", file?.name, safeToken ? safeToken.slice(0, 8) + "..." : "TOKEN AUSENTE");
  const body = new FormData();
  body.append("file", file);
  if (safeToken) body.append("token", safeToken);
  const response = await fetch(`${baseUrl}/api/user/uploads`, {
    method: "POST",
    headers: safeToken
      ? { Authorization: `Bearer ${safeToken}`, "X-Auth-Token": safeToken }
      : {},
    body
  });
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (!response.ok) {
    throw new Error(data.error || "Falha no upload");
  }
  if (!data.url) {
    throw new Error(data.error || "Resposta invalida no upload");
  }
  return data;
}



