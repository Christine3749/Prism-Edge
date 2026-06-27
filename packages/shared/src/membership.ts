import { hsFetch, readHsAccessToken } from "./hsAuth";
import type { Language } from "./translations";

export type MembershipFeatures = Record<string, unknown>;

export interface HsMembershipSnapshot {
  configured?: boolean;
  enforcement?: string;
  productCode?: string;
  user?: {
    id?: string;
    email?: string;
  } | null;
  subscription?: {
    active?: boolean;
    status?: string;
    planCode?: string;
    currentPeriodEnd?: string | null;
  } | null;
  role?: string;
  features?: MembershipFeatures;
  limits?: Record<string, number>;
  usage?: Record<string, number>;
}

export interface MembershipLoadResult {
  signedIn: boolean;
  snapshot: HsMembershipSnapshot | null;
  errorCode?: string;
}

export async function loadMembershipSnapshot(signal?: AbortSignal): Promise<MembershipLoadResult> {
  const signedIn = Boolean(readHsAccessToken());
  if (!signedIn) {
    return { signedIn, snapshot: null, errorCode: "missing_token" };
  }

  try {
    const response = await hsFetch("/api/membership/me", { signal });
    const payload = await readJsonPayload(response);
    if (!response.ok) {
      return {
        signedIn,
        snapshot: null,
        errorCode: readErrorCode(payload, response.status)
      };
    }
    return { signedIn, snapshot: payload as HsMembershipSnapshot };
  } catch (error) {
    if (signal?.aborted) {
      return { signedIn, snapshot: null, errorCode: "aborted" };
    }
    return {
      signedIn,
      snapshot: null,
      errorCode: error instanceof Error ? error.message : "membership_error"
    };
  }
}

export function membershipIsActive(snapshot: HsMembershipSnapshot | null | undefined) {
  return Boolean(snapshot?.subscription?.active);
}

export function hasMembershipFeature(snapshot: HsMembershipSnapshot | null | undefined, featureKey: string) {
  if (!membershipIsActive(snapshot)) return false;
  return snapshot?.features?.[featureKey] === true;
}

export function membershipPlanLabel(snapshot: HsMembershipSnapshot | null | undefined, signedIn: boolean, lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  if (!signedIn) return zh ? "登录" : "Sign In";
  if (!snapshot) return zh ? "校验中" : "Checking";
  if (!membershipIsActive(snapshot)) return normalizeStatusLabel(snapshot.subscription?.status || "pending", lang);
  return normalizePlanLabel(snapshot.subscription?.planCode || snapshot.role || "member");
}

export function normalizePlanLabel(code: string) {
  const normalized = code.trim().toLowerCase().replace(/-/g, "_");
  const labels: Record<string, string> = {
    free: "Free",
    plus: "Plus",
    professional: "Professional",
    quant_pro: "Quant Pro",
    pro: "Pro",
    member: "Member",
    auditor: "Auditor",
    admin: "Admin"
  };
  if (labels[normalized]) return labels[normalized];
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Member";
}

function normalizeStatusLabel(status: string, lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  const normalized = status.trim().toLowerCase();
  if (normalized === "inactive" || normalized === "pending") return zh ? "未激活" : "Pending";
  if (normalized === "expired") return zh ? "已过期" : "Expired";
  if (normalized === "canceled" || normalized === "cancelled") return zh ? "已取消" : "Canceled";
  return zh ? "未激活" : "Pending";
}

async function readJsonPayload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function readErrorCode(payload: Record<string, unknown>, status: number) {
  const code = payload.code || payload.error || payload.message;
  return typeof code === "string" ? code : String(status);
}