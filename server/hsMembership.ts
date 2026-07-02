import type { Request } from "express";
import { HsMembershipError } from "./hsMembershipTypes";
import type { FeatureGate, HsMembershipSnapshot, MembershipResult } from "./hsMembershipTypes";
import {
  disabledSnapshot,
  hasFeature,
  hsEnforcementMode,
  hsProductCode,
  isHsMembershipConfigured,
  loadMembershipSnapshot,
  normalizeMembershipError,
  readBearerToken,
  verifyHsUser
} from "./hsMembershipStore";

export type { HsMembershipSnapshot } from "./hsMembershipTypes";
export { hsEnforcementMode, hsProductCode, isHsMembershipConfigured } from "./hsMembershipStore";

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

function forbiddenPayload(code: string, message: string, snapshot: HsMembershipSnapshot, featureKey: string): Record<string, unknown> {
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