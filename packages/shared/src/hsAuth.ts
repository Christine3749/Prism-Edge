const HS_PROJECT_REF = "hrtynofmjcumuanjvpxz";

const DIRECT_TOKEN_KEYS = [
  "hs_access_token",
  "halfsphere_access_token",
  `sb-${HS_PROJECT_REF}-auth-token`
];

export function hsFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: buildHsAuthHeaders(init.headers)
  });
}

export function buildHsAuthHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  const token = readHsAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export function readHsAccessToken() {
  if (typeof window === "undefined") return "";

  const urlToken = readTokenFromUrl();
  if (urlToken) return urlToken;

  for (const key of DIRECT_TOKEN_KEYS) {
    const token = readStoredToken(key);
    if (token) return token;
  }

  for (const storage of storages()) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || "";
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const token = extractAccessToken(storage.getItem(key) || "", false);
      if (token) return token;
    }
  }

  return "";
}

function readStoredToken(key: string) {
  for (const storage of storages()) {
    const token = extractAccessToken(storage.getItem(key) || "");
    if (token) return token;
  }
  return "";
}

function readTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return extractAccessToken(params.get("access_token") || hash.get("access_token") || "");
}

function storages() {
  const available: Storage[] = [];
  try {
    available.push(window.localStorage);
  } catch {}
  try {
    available.push(window.sessionStorage);
  } catch {}
  return available;
}

function extractAccessToken(raw: string, allowRaw = true): string {
  const value = raw.trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("bearer ")) return value.slice(7).trim();

  try {
    const parsed = JSON.parse(value);
    return readTokenFromObject(parsed);
  } catch {
    return allowRaw ? value : "";
  }
}

function readTokenFromObject(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, any>;
  const direct = record.access_token || record.accessToken;
  if (typeof direct === "string") return direct;

  for (const key of ["session", "currentSession", "data", "userSession"]) {
    const token = readTokenFromObject(record[key]);
    if (token) return token;
  }

  return "";
}