import type { MarketSymbol } from "../../../shared/src/types";
import { readHsAccessToken } from "../../../shared/src/hsAuth";
import { hasMembershipFeature, membershipIsActive, membershipPlanLabel } from "../../../shared/src/membership";
import type { HsMembershipSnapshot } from "../../../shared/src/membership";
import type { Language } from "../../../shared/src/translations";
import type { MarketTrade } from "../../../shared/src/mockMarketData";
import type { MembershipNotice, QuantFeatureAccess } from "./types";

export function buildQuantFeatureAccess(
  snapshot: HsMembershipSnapshot | null,
  signedIn: boolean,
  loading: boolean,
  lang: Language
): QuantFeatureAccess {
  const active = membershipIsActive(snapshot);
  return {
    signedIn,
    active,
    loading,
    planLabel: membershipPlanLabel(snapshot, signedIn, lang),
    quantLab: hasMembershipFeature(snapshot, "quant_lab"),
    modelRegistry: hasMembershipFeature(snapshot, "model_registry"),
    runtimeDiagnostic: hasMembershipFeature(snapshot, "runtime_diagnostic"),
    backtest: hasMembershipFeature(snapshot, "backtest")
  };
}

export function membershipNoticeForFeature(featureKey: string, access: QuantFeatureAccess, lang: Language) {
  const needsLogin = !access.signedIn;
  const needsActivation = access.signedIn && !access.active;
  return membershipNoticeFromPayload({
    error: needsLogin ? "UNAUTHORIZED" : "HS_MEMBERSHIP_REQUIRED",
    code: needsActivation ? "product_not_active" : "feature_forbidden",
    featureKey
  }, needsLogin ? 401 : 403, featureKey, lang) as MembershipNotice;
}
export function buildTrade(liveSymbol: MarketSymbol): MarketTrade {
  const isBuy = Math.random() > 0.46;
  const tickVal = liveSymbol.price * (1 + (Math.random() - 0.5) * 0.001);
  const amount = Math.random() * (liveSymbol.price > 1000 ? 0.3 : 15) + 0.01;
  return {
    time: new Date().toTimeString().split(" ")[0],
    price: Number(tickVal.toFixed(liveSymbol.precision)),
    amount: Number(amount.toFixed(liveSymbol.price > 1000 ? 4 : 2)),
    side: isBuy ? "buy" : "sell"
  };
}

export class MembershipGateError extends Error {
  notice: MembershipNotice;

  constructor(notice: MembershipNotice) {
    super(notice.message);
    this.notice = notice;
  }
}

export async function readJsonOrThrow<T>(response: Response, featureKey: string, lang: Language): Promise<T> {
  const payload = await readJsonPayload(response);
  if (!response.ok) {
    const notice = membershipNoticeFromPayload(payload, response.status, featureKey, lang);
    if (notice) throw new MembershipGateError(notice);
    throw new Error(readPayloadMessage(payload) || `Request failed with ${response.status}`);
  }
  return payload as T;
}

export async function membershipNoticeFromResponse(response: Response, featureKey: string, lang: Language) {
  const payload = await readJsonPayload(response);
  return membershipNoticeFromPayload(payload, response.status, featureKey, lang);
}

async function readJsonPayload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { message: text };
  }
}

function membershipNoticeFromPayload(payload: Record<string, any>, status: number, fallbackFeatureKey: string, lang: Language): MembershipNotice | null {
  const error = String(payload.error || "");
  const code = String(payload.code || "");
  const featureKey = String(payload.featureKey || fallbackFeatureKey || "quant_lab");
  const isMembershipError = error === "HS_MEMBERSHIP_REQUIRED" || error === "UNAUTHORIZED" || status === 401 || status === 403;
  if (!isMembershipError) return null;

  const zh = lang === "zh" || lang === "tc";
  const feature = featureLabel(featureKey, lang);
  const signedIn = Boolean(readHsAccessToken());
  const needsLogin = error === "UNAUTHORIZED" || status === 401 || code === "missing_bearer_token" || !signedIn;
  const needsActivation = code === "product_not_active";
  const href = needsLogin ? "/login" : "/membership";
  const actionLabel = needsLogin
    ? (zh ? "登录会员" : "Sign in")
    : needsActivation
      ? (zh ? "开通会员" : "Activate")
      : (zh ? "查看方案" : "View plan");
  const title = needsLogin
    ? (zh ? "需要登录 MSIR Prism 会员" : "MSIR Prism sign-in required")
    : needsActivation
      ? (zh ? "需要开通 MSIR Prism 会员" : "MSIR Prism membership required")
      : (zh ? "当前方案未解锁" : "Plan upgrade required");
  const requiredPlan = featureKey === "runtime_diagnostic" || featureKey === "backtest" ? "Quant Pro" : "Free / Quant Pro";
  const message = needsLogin
    ? (zh ? `登录后才能运行 ${feature}。` : `Sign in before running ${feature}.`)
    : needsActivation
      ? (zh ? "当前账号还没有 MSIR Prism 产品权限，请先开通 Free 会员。" : "Activate the Free MSIR Prism plan before using this product.")
      : (zh ? `${feature} 需要 ${requiredPlan} 权限。` : `${feature} requires ${requiredPlan}.`);

  return { featureKey, title, message, actionLabel, href };
}

function readPayloadMessage(payload: Record<string, any>) {
  return String(payload.message || payload.error_description || payload.error || "");
}

function featureLabel(featureKey: string, lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  const labels: Record<string, string> = {
    quant_lab: zh ? "AI 智能分析" : "AI analysis",
    model_registry: zh ? "模型注册表" : "model registry",
    runtime_diagnostic: zh ? "DGWM Runtime" : "DGWM runtime",
    backtest: zh ? "回测能力" : "backtest"
  };
  return labels[featureKey] || featureKey;
}
export function getAnalysisFallbackText(lang: Language) {
  if (lang === "zh") {
    return "量化模型接口连接超时。当前使用前端离线保护提示：结构暂按震荡处理，等待突破或回踩确认。";
  }
  if (lang === "tc") {
    return "量化模型接口連接超時。當前使用前端離線保護提示：結構暫按震盪處理，等待突破或回踩確認。";
  }
  return "Quant model interface timeout. Frontend safety fallback: structure is treated as range-bound until breakout or pullback confirmation.";
}

export function getBacktestFallbackText(lang: Language) {
  if (lang === "zh") return "回测接口暂不可用，请稍后重试。";
  if (lang === "tc") return "回測接口暫不可用，請稍後重試。";
  return "Backtest endpoint is unavailable. Please retry shortly.";
}

export function getRuntimeFallbackText(lang: Language) {
  if (lang === "zh") return "DGWM 真实诊断暂不可用，请确认 FastAPI 和 DGWM .venv 已启动。";
  if (lang === "tc") return "DGWM 真實診斷暫不可用，請確認 FastAPI 和 DGWM .venv 已啟動。";
  return "DGWM runtime diagnostic is unavailable. Check FastAPI and the DGWM .venv.";
}
