export const DEFAULT_PRODUCT_CODE = "msir_prism";
export const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export type EnforcementMode = "off" | "warn" | "enforce";

export type HsUser = {
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

export type MembershipResult =
  | { ok: true; snapshot: HsMembershipSnapshot }
  | { ok: false; status: number; payload: Record<string, unknown> };

export type FeatureGate =
  | { allowed: true; snapshot: HsMembershipSnapshot; warning?: string }
  | { allowed: false; status: number; payload: Record<string, unknown> };

export class HsMembershipError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}