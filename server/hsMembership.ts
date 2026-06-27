import type { Request } from "express";

const DEFAULT_PRODUCT_CODE = "msir_prism";
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

type EnforcementMode = "off" | "warn" | "enforce";

type HsUser = {
  id: string;
  email: string;
};

export type HsMembershipSnapshot = {
  schema: "hs.membership.snapshot.v1";
  source: "halfsphere";
  configured: boolean;
  enforcement: EnforcementMode;
  productCode: string;
  user: HsUser | null;
  subscription: {
    active: boolean;
    status: string;
    planCode: string;
    currentPeriodEnd: string;
  };
  role: string;
  features: Record<string, unknown>;
  limits: Record<string, number>;
  usage: Record<string, number>;
  diagnostics: Record<string, unknown>;
};

type MembershipResult =
  | { ok: true; snapshot: HsMembershipSnapshot }
  | { ok: false; status: number; payload: Record<string, unknown> };

type FeatureGate =
  | { allowed: true; snapshot: HsMembershipSnapshot; warning?: string }
  | { allowed: false; status: number; payload: Record<string, unknown> };

class HsMembershipError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function hsProductCode() {
  return process.env.HS_PRODUCT_CODE || DEFAULT_PRODUCT_CODE;
}

export function hsEnforcementMode(): EnforcementMode {
  const raw = String(process.env.HS_MEMBERSHIP_ENFORCEMENT || "off").trim().toLowerCase();
  if (raw === "enforce" || raw === "required" || raw === "true") return "enforce";
  if (raw === "warn" || raw === "shadow") return "warn";
  return "off";
}

export function isHsMembershipConfigured() {
  return Boolean(hsSupabaseUrl() && hsAnonKey());
}

export async function getHsMembershipForRequest(req: Request): Promise<MembershipResult> {
  if (!isHsMembershipConfigured()) {
    const snapshot = disabledSnapshot({ reason: "hs_not_configured" });
    if (hsEnforcementMode() === "enforce") {
      return denied(503, "hs_not_configured", "HS membership is required but not configured.", snapshot);
    }
    return { ok: true, snapshot };
  }

  try {
    const token = readBearerToken(req.headers.authorization);
    if (!token) throw new HsMembershipError(401, "missing_bearer_token", "Missing HS Supabase access token.");

    const user = await verifyHsUser(token);
    const snapshot = await loadMembershipSnapshot(token, user);
    return { ok: true, snapshot };
  } catch (error) {
    const membershipError = normalizeMembershipError(error);
    return denied(membershipError.status, membershipError.code, membershipError.message);
  }
}

export async function checkHsFeature(req: Request, featureKey: string): Promise<FeatureGate> {
  const mode = hsEnforcementMode();
  if (mode === "off") {
    const result = await getHsMembershipForRequest(req);
    if (result.ok === true) return { allowed: true, snapshot: result.snapshot };
    return { allowed: true, snapshot: disabledSnapshot({ reason: result.payload.code || "hs_unavailable" }), warning: String(result.payload.code || "hs_unavailable") };
  }

  const result = await getHsMembershipForRequest(req);
  if (result.ok === false) {
    if (mode === "warn") {
      return { allowed: true, snapshot: disabledSnapshot({ reason: result.payload.code || "hs_unavailable" }), warning: String(result.payload.code || "hs_unavailable") };
    }
    return resultToGate(result);
  }

  const snapshot = result.snapshot;
  if (!snapshot.subscription.active) {
    const payload = forbiddenPayload("product_not_active", `HS product ${snapshot.productCode} is not active for this user.`, snapshot, featureKey);
    return mode === "warn" ? { allowed: true, snapshot, warning: "product_not_active" } : { allowed: false, status: 403, payload };
  }

  if (!hasFeature(snapshot.features, featureKey)) {
    const payload = forbiddenPayload("feature_not_enabled", `HS feature ${featureKey} is not enabled for this plan.`, snapshot, featureKey);
    return mode === "warn" ? { allowed: true, snapshot, warning: "feature_not_enabled" } : { allowed: false, status: 403, payload };
  }

  return { allowed: true, snapshot };
}

function resultToGate(result: MembershipResult): FeatureGate {
  if (result.ok === true) return { allowed: true, snapshot: result.snapshot };
  return { allowed: false, status: result.status, payload: result.payload };
}

function forbiddenPayload(
  code: string,
  message: string,
  snapshot: HsMembershipSnapshot,
  featureKey: string,
): Record<string, unknown> {
  return {
    error: "HS_MEMBERSHIP_REQUIRED",
    code,
    message,
    productCode: snapshot.productCode,
    featureKey,
    membership: snapshot,
  };
}

function denied(status: number, code: string, message: string, snapshot?: HsMembershipSnapshot): MembershipResult {
  return {
    ok: false,
    status,
    payload: {
      error: status === 401 ? "UNAUTHORIZED" : "HS_MEMBERSHIP_UNAVAILABLE",
      code,
      message,
      productCode: hsProductCode(),
      membership: snapshot,
    },
  };
}

function disabledSnapshot(diagnostics: Record<string, unknown> = {}): HsMembershipSnapshot {
  return {
    schema: "hs.membership.snapshot.v1",
    source: "halfsphere",
    configured: false,
    enforcement: hsEnforcementMode(),
    productCode: hsProductCode(),
    user: null,
    subscription: {
      active: false,
      status: "disabled",
      planCode: "local-dev",
      currentPeriodEnd: "",
    },
    role: "anonymous",
    features: {},
    limits: {},
    usage: {},
    diagnostics,
  };
}

async function verifyHsUser(token: string): Promise<HsUser> {
  const response = await hsFetch("/auth/v1/user", {
    token,
    useUserToken: true,
    acceptObject: true,
  });
  const user = response as Record<string, any>;
  const id = String(user.id || user.user?.id || "");
  const email = String(user.email || user.user?.email || "");
  if (!id) throw new HsMembershipError(401, "invalid_bearer_token", "HS token did not resolve to a user.");
  return { id, email };
}

async function loadMembershipSnapshot(token: string, user: HsUser): Promise<HsMembershipSnapshot> {
  const productCode = hsProductCode();
  const viewRow = await firstRow([
    () => hsRows("hs_current_memberships", { user_id: `eq.${user.id}`, product_code: `eq.${productCode}`, select: "*" }, token),
    () => hsRows("hs_current_memberships", { product_code: `eq.${productCode}`, select: "*" }, token),
    () => hsRows("hs_current_memberships", { user_id: `eq.${user.id}`, product_code: `eq.${productCode}`, select: "*" }, token, true),
  ]);

  if (viewRow) {
    return normalizeSnapshot({ row: viewRow, user, productCode, diagnostics: { sourceTable: "hs_current_memberships" } });
  }

  const subscription = await firstRow([
    () => hsRows("hs_subscriptions", { user_id: `eq.${user.id}`, product_code: `eq.${productCode}`, select: "*" }, token),
    () => hsRows("hs_subscriptions", { product_code: `eq.${productCode}`, select: "*" }, token),
    () => hsRows("hs_subscriptions", { user_id: `eq.${user.id}`, product_code: `eq.${productCode}`, select: "*" }, token, true),
  ]);

  if (!subscription) {
    return normalizeSnapshot({
      row: {},
      user,
      productCode,
      diagnostics: { sourceTable: "none", reason: "no_subscription" },
    });
  }

  const planCode = planCodeFromRow(subscription);
  const planId = String(subscription.plan_id || subscription.membership_plan_id || "");
  const plan = await loadPlan(token, productCode, planCode, planId);
  return normalizeSnapshot({
    row: subscription,
    plan: plan || undefined,
    user,
    productCode,
    diagnostics: { sourceTable: "hs_subscriptions", planResolved: Boolean(plan) },
  });
}

async function loadPlan(token: string, productCode: string, planCode: string, planId: string) {
  const attempts: Array<() => Promise<Record<string, any>[]>> = [];
  if (planCode) {
    attempts.push(() => hsRows("hs_membership_plans", { product_code: `eq.${productCode}`, code: `eq.${planCode}`, select: "*" }, token));
  }
  if (planId) {
    attempts.push(() => hsRows("hs_membership_plans", { id: `eq.${planId}`, select: "*" }, token));
  }
  return firstRow(attempts);
}

async function firstRow(attempts: Array<() => Promise<Record<string, any>[]>>) {
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const rows = await attempt();
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof HsMembershipError && lastError.status >= 500) throw lastError;
  return null;
}

function normalizeSnapshot({
  row,
  plan,
  user,
  productCode,
  diagnostics,
}: {
  row: Record<string, any>;
  plan?: Record<string, any>;
  user: HsUser;
  productCode: string;
  diagnostics: Record<string, unknown>;
}): HsMembershipSnapshot {
  const features = objectValue(row.features) || objectValue(row.plan_features) || objectValue(row.plan?.features) || objectValue(row.hs_membership_plans?.features) || objectValue(plan?.features) || {};
  const status = subscriptionStatus(row);
  return {
    schema: "hs.membership.snapshot.v1",
    source: "halfsphere",
    configured: true,
    enforcement: hsEnforcementMode(),
    productCode,
    user,
    subscription: {
      active: Boolean(row.subscription_active) || ACTIVE_STATUSES.has(status),
      status,
      planCode: planCodeFromRow(row) || planCodeFromRow(plan || {}),
      currentPeriodEnd: String(row.current_period_end || row.current_period_end_at || row.expires_at || ""),
    },
    role: String(row.role || row.auth_role || row.member_role || row.product_role || "subscriber"),
    features,
    limits: limitsFrom(features, row, plan),
    usage: usageFrom(row),
    diagnostics,
  };
}

function subscriptionStatus(row: Record<string, any>) {
  return String(row.subscription_status || row.status || row.subscription?.status || "inactive").toLowerCase();
}

function planCodeFromRow(row: Record<string, any>) {
  return String(row.plan_code || row.plan || row.code || row.planCode || row.hs_membership_plans?.code || "");
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function limitsFrom(features: Record<string, unknown>, row: Record<string, any>, plan?: Record<string, any>) {
  const limits: Record<string, number> = {};
  for (const [key, value] of Object.entries(features)) {
    if (typeof value === "number" && Number.isFinite(value)) limits[key] = value;
  }
  for (const source of [row, plan || {}]) {
    for (const [key, value] of Object.entries(source)) {
      if (!key.startsWith("max_") && !key.endsWith("_limit") && !key.endsWith("_quota")) continue;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) limits[key] = numeric;
    }
  }
  return limits;
}

function usageFrom(row: Record<string, any>) {
  const usage = objectValue(row.usage);
  if (!usage) return {};

  return Object.fromEntries(
    Object.entries(usage)
      .map(([key, value]) => [key, Number(value)] as const)
      .filter(([, value]) => Number.isFinite(value))
  );
}

function hasFeature(features: Record<string, unknown>, featureKey: string) {
  if (features["*"] === true || features.all === true) return true;
  const value = features[featureKey];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return ["true", "yes", "enabled", "allow"].includes(value.toLowerCase());
  return false;
}

async function hsRows(table: string, filters: Record<string, string>, token: string, preferService = false) {
  const search = new URLSearchParams(filters);
  const response = await hsFetch(`/rest/v1/${table}?${search.toString()}`, {
    token,
    useServiceRole: preferService,
    acceptObject: false,
  });
  return Array.isArray(response) ? response as Record<string, any>[] : [];
}

async function hsFetch(
  path: string,
  options: { token: string; useUserToken?: boolean; useServiceRole?: boolean; acceptObject: boolean },
) {
  const baseUrl = hsSupabaseUrl();
  const anonKey = hsAnonKey();
  if (!baseUrl || !anonKey) throw new HsMembershipError(503, "hs_not_configured", "HS Supabase env is not configured.");

  const serviceRole = hsServiceRoleKey();
  const useService = Boolean(options.useServiceRole && serviceRole);
  const apiKey = useService ? serviceRole : anonKey;
  const authToken = useService ? serviceRole : options.token;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(6000),
  });

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new HsMembershipError(response.status, "hs_auth_rejected", text || "HS rejected the token.");
    }
    throw new HsMembershipError(502, "hs_query_failed", text || `HS request failed with ${response.status}.`);
  }

  if (!text) return options.acceptObject ? {} : [];
  try {
    return JSON.parse(text);
  } catch {
    throw new HsMembershipError(502, "hs_invalid_json", "HS returned invalid JSON.");
  }
}

function normalizeMembershipError(error: unknown): HsMembershipError {
  if (error instanceof HsMembershipError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new HsMembershipError(502, "hs_membership_error", message || "HS membership check failed.");
}

function readBearerToken(header: unknown) {
  const value = Array.isArray(header) ? header[0] : String(header || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function hsSupabaseUrl() {
  return String(process.env.HS_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
}

function hsAnonKey() {
  return String(process.env.HS_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "");
}

function hsServiceRoleKey() {
  return String(process.env.HS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
}
