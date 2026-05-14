// Production frontend on Vercel must always talk to the Hostinger backend.
// Use the explicit front controller to avoid relying on rewrite behavior that
// can vary between shared-hosting environments.
const DEFAULT_PROD_API_URL = "https://orange-bison-917444.hostingersite.com/Backend/public/index.php";

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_PROD_API_URL;
  if (/copartatendimento\.com/i.test(trimmed)) return DEFAULT_PROD_API_URL;
  if (/localhost\/Copart\/Backend\/public/i.test(trimmed)) return DEFAULT_PROD_API_URL;
  if (/hostingersite\.com\/Backend\/public$/i.test(trimmed)) return `${trimmed}/index.php`;
  return trimmed;
}

export const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_PROD_API_URL : "http://localhost/Copart/Backend/public/index.php")
);

const apiBaseDirectoryUrl = apiBaseUrl.replace(/\/index\.php$/i, "");

function composeApiUrl(base, path) {
  const safePath = String(path || "").startsWith("/") ? String(path || "") : `/${String(path || "")}`;
  return `${base}${safePath}`;
}

export function buildApiUrl(path) {
  return composeApiUrl(apiBaseDirectoryUrl, path);
}

export function normalizeAssetUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;

  const buildPublicFileUrl = (relativePath) =>
    buildApiUrl(`/api/public-file?path=${encodeURIComponent(String(relativePath || "").replace(/^\/+/, ""))}`);

  if (/^(uploads\/|Backend\/public\/uploads\/)/i.test(trimmed)) {
    return buildPublicFileUrl(trimmed.replace(/^Backend\/public\//i, ""));
  }

  try {
    const parsed = new URL(trimmed, apiBaseDirectoryUrl + "/");
    const marker = "/uploads/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      const relativePath = parsed.pathname.slice(markerIndex + 1);
      return buildPublicFileUrl(relativePath);
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

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

async function fetchWithApiFallback(path, options = {}) {
  const primaryUrl = composeApiUrl(apiBaseUrl, path);
  debugLog(options.method || "GET", primaryUrl, options.body || "");
  let response = await fetch(primaryUrl, options);
  if (response.status !== 404 || !/\/index\.php$/i.test(apiBaseUrl)) {
    return response;
  }

  const fallbackUrl = composeApiUrl(apiBaseDirectoryUrl, path);
  debugLog("Retry", fallbackUrl);
  response = await fetch(fallbackUrl, options);
  return response;
}

export async function apiGet(path) {
  const response = await fetchWithApiFallback(path);
  return parseResponse(response);
}

export async function apiGetAuth(path, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("GET", `${apiBaseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("GET", composeApiUrl(apiBaseUrl, path), "Bearer", safeToken.slice(0, 8) + "...");
  const response = await fetchWithApiFallback(path, {
    headers: {
      Authorization: `Bearer ${safeToken}`,
      "X-Auth-Token": safeToken
    }
  });
  return parseResponse(response);
}

export async function apiPost(path, body) {
  const payload = toFormBody(body);
  const response = await fetchWithApiFallback(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: payload
  });
  return parseResponse(response);
}

export async function apiPostAuth(path, body, token) {
  const safeToken = normalizeToken(token);
  if (!safeToken) {
    debugLog("POST", `${apiBaseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  const payload = toFormBody(body);
  const response = await fetchWithApiFallback(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
    debugLog("PUT", `${apiBaseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  const payload = toFormBody(body);
  const response = await fetchWithApiFallback(path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
    debugLog("DELETE", `${apiBaseUrl}${path}`, "TOKEN AUSENTE");
    throw new Error("Token ausente");
  }
  debugLog("DELETE", composeApiUrl(apiBaseUrl, path), "Bearer", safeToken.slice(0, 8) + "...");
  const response = await fetchWithApiFallback(path, {
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
  if (safeToken) body.append("token", safeToken);
  const response = await fetchWithApiFallback("/api/uploads", {
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
  const response = await fetchWithApiFallback("/api/user/uploads", {
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
