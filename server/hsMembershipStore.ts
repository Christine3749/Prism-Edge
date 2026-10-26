import { ACTIVE_STATUSES, DEFAULT_PRODUCT_CODE, HsMembershipError } from "./hsMembershipTypes";
import type { EnforcementMode, HsMembershipSnapshot, HsUser } from "./hsMembershipTypes";
import { hsApiBaseUrl, hsApiRequest } from "./hsApi";

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
  return Boolean(hsApiBaseUrl());
}

export function disabledSnapshot(diagnostics: Record<string, unknown> = {}): HsMembershipSnapshot {
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

export async function verifyHsUser(token: string): Promise<HsUser> {
  const response = await hsApiRequest("/auth/me?profile=identity", {
    token,
    timeoutMs: 6000,
  });
  const user = response as Record<string, any>;
  const id = String(user.id || user.user?.id || "");
  const email = String(user.email || user.user?.email || "");
  if (!id) throw new HsMembershipError(401, "invalid_bearer_token", "HS token did not resolve to a user.");
  return { id, email };
}

export async function loadMembershipSnapshot(token: string, user: HsUser): Promise<HsMembershipSnapshot> {
  const productCode = hsProductCode();
  const payload = await hsApiRequest(`/auth/membership/${encodeURIComponent(productCode)}`, { token, timeoutMs: 6000 });
  const subscription = objectValue(payload.membership);
  const plans: Record<string, any>[] = Array.isArray(payload.plans) ? payload.plans : [];
  const plan = subscription ? plans.find((item) =>
    (subscription.plan_id && item.id === subscription.plan_id) ||
    (subscription.plan_code && item.code === subscription.plan_code)
  ) : undefined;
  return normalizeSnapshot({
    row: subscription || {},
    plan,
    user,
    productCode,
    diagnostics: { sourceApi: "hs-account-membership", reason: subscription ? "membership_found" : "no_subscription", planResolved: Boolean(plan) },
  });
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

export function hasFeature(features: Record<string, unknown>, featureKey: string) {
  if (features["*"] === true || features.all === true) return true;
  const value = features[featureKey];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") return ["true", "yes", "enabled", "allow"].includes(value.toLowerCase());
  return false;
}

export function normalizeMembershipError(error: unknown): HsMembershipError {
  if (error instanceof HsMembershipError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new HsMembershipError(502, "hs_membership_error", message || "HS membership check failed.");
}

export function readBearerToken(header: unknown) {
  const value = Array.isArray(header) ? header[0] : String(header || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

