import { HsMembershipError } from "./hsMembershipTypes";

// The existing account service on Aliyun 210 owns identity and password checks.
export function hsApiBaseUrl() {
  return String(process.env.HS_ACCOUNT_URL || "https://account.gsyen.com").replace(/\/+$/, "");
}

export async function hsApiRequest(
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: string; token?: string; timeoutMs?: number } = {},
): Promise<Record<string, any>> {
  const response = await fetch(`${hsApiBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
    signal: AbortSignal.timeout(options.timeoutMs || 8000),
  });

  const text = await response.text();
  let payload: Record<string, any> = {};
  if (text) {
    try { payload = JSON.parse(text); }
    catch { throw new HsMembershipError(502, "hs_invalid_json", "HS returned invalid JSON."); }
  }
  if (!response.ok) {
    const message = String(payload.message || payload.msg || payload.error_description || payload.error || `HS request failed with ${response.status}.`);
    const code = response.status === 401 || response.status === 400 ? "INVALID_CREDENTIALS" : "HS_AUTH_REQUEST_FAILED";
    throw new HsMembershipError(response.status, code, message);
  }
  return payload;
}
