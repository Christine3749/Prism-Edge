import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Brain, Check, Crown, Database, Gauge, LockKeyhole, Moon, Settings, ShieldCheck, Sparkles, Sun, UserCircle } from "lucide-react";
import { hsFetch, readHsAccessToken } from "@shared/hsAuth";
import { StorageService } from "@shared/storage";
import type { AppSettings } from "@shared/types";
import Logo from "@ui/Logo";
import { DEFAULT_APP_SETTINGS } from "./config/appDefaults";

type MembershipSnapshot = {
  configured?: boolean;
  productCode?: string;
  user?: { email?: string } | null;
  subscription?: {
    active?: boolean;
    status?: string;
    planCode?: string;
    currentPeriodEnd?: string;
  };
  role?: string;
  features?: Record<string, unknown>;
  limits?: Record<string, number>;
  diagnostics?: Record<string, unknown>;
  code?: string;
  message?: string;
};

type MembershipTone = ReturnType<typeof buildMembershipTone>;

export default function MembershipPage() {
  const [snapshot, setSnapshot] = useState<MembershipSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.loadSettings(DEFAULT_APP_SETTINGS));
  const token = useMemo(() => readHsAccessToken(), []);
  const isLight = settings.theme === "light";
  const tone = buildMembershipTone(isLight);

  async function loadMembership() {
    setLoading(true);
    setError("");
    try {
      const response = await hsFetch("/api/membership/me");
      const payload = await response.json();
      if (!response.ok) throw new Error(normalizeMembershipError(payload.message || payload.msg || payload.code || "会员状态读取失败。"));
      setSnapshot(payload);
    } catch (err) {
      setError(normalizeMembershipError(err instanceof Error ? err.message : "会员状态读取失败。"));
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }

  async function activateFree() {
    setActivating(true);
    setError("");
    try {
      const response = await hsFetch("/api/membership/activate-free", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(normalizeMembershipError(payload.message || payload.msg || payload.code || "开通失败。"));
      await loadMembership();
    } catch (err) {
      setError(normalizeMembershipError(err instanceof Error ? err.message : "开通失败，请稍后再试。"));
    } finally {
      setActivating(false);
    }
  }

  function toggleTheme() {
    setSettings((prev) => {
      const next: AppSettings = { ...prev, theme: prev.theme === "light" ? "dark" : "light" };
      StorageService.saveSettings(next);
      return next;
    });
  }

  useEffect(() => {
    document.title = "MSIR Prism 会员中心";
    if (token) void loadMembership();
    else setLoading(false);
  }, [token]);

  const isActive = Boolean(snapshot?.subscription?.active);
  const planCode = snapshot?.subscription?.planCode || (token ? "pending" : "guest");
  const email = snapshot?.user?.email || "未登录";
  const features = snapshot?.features || {};

  return (
    <main className={cn("prism-auth-page relative min-h-screen overflow-auto", tone.page)}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isLight ? 0.55 : 0.36,
          backgroundImage: `linear-gradient(${tone.grid} 1px, transparent 1px), linear-gradient(90deg, ${tone.grid} 1px, transparent 1px)`,
          backgroundSize: "44px 44px"
        }}
      />
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-px", isLight ? "bg-[#c7d6e4]" : "bg-[#12324a]")} />

      <div className="relative mx-auto min-h-screen w-full max-w-7xl px-5 py-5">
        <header className={cn("flex items-center justify-between border-b pb-4", tone.border)}>
          <a href="/" className={cn("flex items-center gap-3 no-underline", tone.title)}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded border", tone.logoBox)}>
              <Logo className="h-8" showText={false} />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide">MSIR Prism</div>
              <div className={cn("text-[10px] uppercase tracking-[0.28em]", tone.subtle)}>Member Center</div>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={cn("flex h-8 w-8 items-center justify-center rounded border transition", tone.secondaryButton)}
              title={isLight ? "切换深色" : "切换浅色"}
              aria-label={isLight ? "切换深色" : "切换浅色"}
            >
              {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <a href="/" className={cn("flex h-8 items-center gap-2 rounded border px-3 text-xs font-semibold no-underline transition", tone.secondaryButton)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              返回终端
            </a>
            {!token && (
              <a href="/login" className={cn("flex h-8 items-center rounded border px-3 text-xs font-black no-underline transition", tone.primaryButton)}>
                登录
              </a>
            )}
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[250px_1fr]">
          <aside className="space-y-4">
            <div className={cn("rounded border p-4", tone.panel)}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded border", tone.iconBox)}>
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className={cn("truncate text-sm font-black", tone.title)}>MSIR Prism 账号</div>
                  <div className={cn("truncate text-[11px]", tone.muted)}>{email}</div>
                </div>
              </div>
            </div>
            <nav className={cn("rounded border p-2 text-sm", tone.panel)}>
              <SideItem tone={tone} active icon={<UserCircle className="h-4 w-4" />} label="账户信息" />
              <SideItem tone={tone} icon={<ShieldCheck className="h-4 w-4" />} label="我的权限" />
              <SideItem tone={tone} icon={<Crown className="h-4 w-4" />} label="会员方案" />
              <SideItem tone={tone} icon={<Settings className="h-4 w-4" />} label="账户设置" />
            </nav>
          </aside>

          <section className="space-y-5">
            <div className={cn("border-b pb-5", tone.border)}>
              <div className={cn("text-[11px] font-bold uppercase tracking-[0.28em]", tone.accent)}>Membership Control</div>
              <h1 className={cn("prism-auth-title mt-2 text-3xl", tone.title)}>MSIR Prism 会员中心</h1>
              <p className={cn("mt-2 max-w-3xl text-sm leading-6", tone.muted)}>
                管理 MSIR Prism 权限、产品访问和账户授权状态。这里面向普通会员，内部运营授权仍由 HS 后台托管。
              </p>
            </div>

            {!token && <GuestPanel tone={tone} />}
            {error && <ErrorPanel tone={tone} message={error} />}
            {loading && <div className={cn("rounded border p-6 text-sm", tone.panel, tone.muted)}>正在读取会员状态...</div>}

            {!loading && token && (
              <>
                <div className="grid gap-3 xl:grid-cols-3">
                  <StatusPanel tone={tone} title="当前方案" value={planCode.toUpperCase()} meta={isActive ? "已激活" : "未激活"} icon={<Crown className="h-5 w-5" />} accent={isActive ? "cyan" : "amber"} />
                  <StatusPanel tone={tone} title="产品权限" value="MSIR PRISM" meta={snapshot?.productCode || "msir_prism"} icon={<ShieldCheck className="h-5 w-5" />} accent="cyan" />
                  <StatusPanel tone={tone} title="授权来源" value="HS" meta="后台授权托管" icon={<LockKeyhole className="h-5 w-5" />} accent="slate" />
                </div>

                {!isActive && (
                  <div className={cn("flex flex-col gap-3 rounded border p-5 sm:flex-row sm:items-center sm:justify-between", tone.notice)}>
                    <div>
                      <div className={cn("font-black", tone.title)}>还没有 MSIR Prism 会员权限</div>
                      <div className={cn("mt-1 text-sm", tone.muted)}>可以先开通 Free 方案，后续再升级 Quant Pro。</div>
                    </div>
                    <button
                      type="button"
                      onClick={activateFree}
                      disabled={activating}
                      className={cn("inline-flex h-10 items-center justify-center gap-2 rounded border px-4 text-[12px] font-bold tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-60", tone.primaryButton)}
                    >
                      <Crown className="h-3.5 w-3.5" />
                      <span>{activating ? "启用中..." : "启用 Free Access"}</span>
                    </button>
                  </div>
                )}

                <div className="grid gap-3 xl:grid-cols-2">
                  <PermissionCard tone={tone} icon={<Brain className="h-4 w-4" />} title="AI 智能分析" enabled={featureEnabled(features.quant_lab)} detail="K 线解释、趋势判断、关键位推演" />
                  <PermissionCard tone={tone} icon={<Database className="h-4 w-4" />} title="模型注册表" enabled={featureEnabled(features.model_registry)} detail="读取可用量化模型和版本" />
                  <PermissionCard tone={tone} icon={<Gauge className="h-4 w-4" />} title="DGWM Runtime" enabled={featureEnabled(features.runtime_diagnostic)} detail="运行 DGWM 诊断和决策请求" />
                  <PermissionCard tone={tone} icon={<Sparkles className="h-4 w-4" />} title="回测能力" enabled={featureEnabled(features.backtest)} detail="策略回测、权益曲线、回撤分析" />
                </div>

                <div className={cn("overflow-hidden rounded border", tone.panel)}>
                  <div className={cn("border-b px-5 py-4", tone.border)}>
                    <div className={cn("text-sm font-black", tone.title)}>账户信息</div>
                    <div className={cn("mt-1 text-xs", tone.muted)}>基础资料和授权状态</div>
                  </div>
                  <div className={cn("divide-y", tone.divide)}>
                    <InfoRow tone={tone} label="邮箱" value={email} />
                    <InfoRow tone={tone} label="角色" value={snapshot?.role || "guest"} />
                    <InfoRow tone={tone} label="订阅状态" value={snapshot?.subscription?.status || "inactive"} />
                    <InfoRow tone={tone} label="周期结束" value={snapshot?.subscription?.currentPeriodEnd || "-"} />
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function GuestPanel({ tone }: { tone: MembershipTone }) {
  return (
    <div className={cn("grid gap-4 rounded border p-6 lg:grid-cols-[1fr_auto] lg:items-center", tone.panel)}>
      <div>
        <div className={cn("text-lg font-black", tone.title)}>请先登录 MSIR Prism</div>
        <p className={cn("mt-2 max-w-2xl text-sm leading-6", tone.muted)}>
          登录后可以查看你的方案等级、量化权限和模型额度。普通会员不会进入内部运营后台。
        </p>
      </div>
      <a href="/login" className={cn("flex h-10 items-center justify-center rounded border px-4 text-sm font-black no-underline transition", tone.primaryButton)}>登录会员账号</a>
    </div>
  );
}

function ErrorPanel({ tone, message }: { tone: MembershipTone; message: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", tone.error)}>
      <span>{message}</span>
      <a href="/login" className={cn("shrink-0 rounded border px-3 py-1.5 text-xs font-black no-underline", tone.errorAction)}>重新登录</a>
    </div>
  );
}

function SideItem({ tone, icon, label, active = false }: { tone: MembershipTone; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded px-3 py-2", active ? tone.sideActive : tone.sideIdle)}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatusPanel({ tone, title, value, meta, icon, accent }: { tone: MembershipTone; title: string; value: string; meta: string; icon: ReactNode; accent: "cyan" | "amber" | "slate" }) {
  return (
    <div className={cn("rounded border p-5", tone.panel)}>
      <div className={cn("mb-5 inline-flex h-9 w-9 items-center justify-center rounded border", tone.statusAccent[accent])}>{icon}</div>
      <div className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", tone.subtle)}>{title}</div>
      <div className={cn("mt-2 text-xl font-black", tone.title)}>{value}</div>
      <div className={cn("mt-1 text-xs", tone.muted)}>{meta}</div>
    </div>
  );
}

function PermissionCard({ tone, icon, title, detail, enabled }: { tone: MembershipTone; icon: ReactNode; title: string; detail: string; enabled: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 rounded border p-4", tone.panel)}>
      <div className={enabled ? tone.enabledIcon : tone.disabledIcon}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className={cn("font-bold", tone.title)}>{title}</div>
          <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", enabled ? tone.enabledBadge : tone.lockedBadge)}>
            {enabled && <Check className="h-3 w-3" />}
            {enabled ? "Enabled" : "Locked"}
          </span>
        </div>
        <div className={cn("mt-1 text-xs", tone.muted)}>{detail}</div>
      </div>
    </div>
  );
}

function InfoRow({ tone, label, value }: { tone: MembershipTone; label: string; value: string }) {
  return (
    <div className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[160px_1fr]">
      <div className={tone.muted}>{label}</div>
      <div className={cn("font-mono", tone.title)}>{value}</div>
    </div>
  );
}

function buildMembershipTone(light: boolean) {
  if (light) {
    return {
      page: "bg-[#f5f7fa] text-[#17202c]",
      grid: "rgba(95, 122, 146, 0.13)",
      border: "border-[#d8e1ea]",
      divide: "divide-[#d8e1ea]",
      panel: "border-[#d8e1ea] bg-[#f8fafc]",
      notice: "border-[#c5d6e5] bg-[#eef5fa]",
      logoBox: "border-[#bfd0df] bg-[#eef4f9] text-[#2f6f99]",
      iconBox: "border-[#bfd0df] bg-[#eef4f9] text-[#2f6f99]",
      title: "text-[#17202c]",
      muted: "text-[#667587]",
      subtle: "text-[#7b8a9c]",
      accent: "text-[#2f6f99]",
      primaryButton: "border-[#9fb8cc] bg-[#dceaf5] text-[#174f78] hover:bg-[#d2e2ef]",
      secondaryButton: "border-[#ccd9e5] bg-[#f8fafc] text-[#4d6074] hover:border-[#aebfd0] hover:bg-[#eef4f9]",
      sideActive: "bg-[#e8f0f7] text-[#174f78]",
      sideIdle: "text-[#738294] hover:bg-[#eef4f9] hover:text-[#26384d]",
      enabledIcon: "text-[#2f8c78]",
      disabledIcon: "text-[#9aa8b7]",
      enabledBadge: "border-[#a9d4c7] bg-[#eef8f5] text-[#14745f]",
      lockedBadge: "border-[#cbd8e5] bg-[#f2f5f8] text-[#7a8795]",
      error: "border-[#dec483] bg-[#fff8e4] text-[#76570a]",
      errorAction: "border-[#d3b46c] bg-[#fffdf4] text-[#6d5108] hover:bg-[#fff3c4]",
      statusAccent: {
        cyan: "border-[#afd1df] bg-[#edf7fa] text-[#2f6f99]",
        amber: "border-[#dfc875] bg-[#fff7d6] text-[#8a6504]",
        slate: "border-[#cbd8e5] bg-[#eef3f8] text-[#4d6074]"
      }
    };
  }

  return {
    page: "bg-[#000814] text-slate-100",
    grid: "rgba(47, 111, 153, 0.13)",
    border: "border-[#12324a]",
    divide: "divide-[#12324a]",
    panel: "border-[#12324a] bg-[#020b18]/92",
    notice: "border-[#1c5a73] bg-[#041725]/86",
    logoBox: "border-[#12324a] bg-[#031426] text-[#5fb2d4]",
    iconBox: "border-[#1d4d6d] bg-[#031426] text-[#5fb2d4]",
    title: "text-slate-100",
    muted: "text-slate-500",
    subtle: "text-slate-600",
    accent: "text-[#5fb2d4]",
    primaryButton: "border-[#2f6f99]/70 bg-[#06213a] text-[#b8d8ea] hover:bg-[#0b2a44] hover:text-white",
    secondaryButton: "border-[#12324a] bg-[#020b18] text-slate-400 hover:border-[#2f6f99]/70 hover:text-slate-100",
    sideActive: "bg-[#061a2b] text-[#5fb2d4]",
    sideIdle: "text-slate-500 hover:bg-[#031426] hover:text-slate-300",
    enabledIcon: "text-emerald-300",
    disabledIcon: "text-slate-700",
    enabledBadge: "border-emerald-300/30 bg-emerald-300/10 text-emerald-300",
    lockedBadge: "border-slate-700 bg-[#020b18] text-slate-500",
    error: "border-amber-500/30 bg-amber-950/15 text-amber-200",
    errorAction: "border-amber-500/30 bg-[#020b18] text-amber-200 hover:text-amber-100",
    statusAccent: {
      cyan: "border-[#2f6f99]/35 bg-[#06213a]/55 text-[#5fb2d4]",
      amber: "border-amber-400/30 bg-amber-950/15 text-amber-300",
      slate: "border-slate-700 bg-[#031426] text-slate-300"
    }
  };
}

function normalizeMembershipError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("bad_jwt") || lower.includes("invalid jwt")) {
    return "登录状态已过期，请重新登录后再查看会员权限。";
  }
  if (lower.includes("missing") && lower.includes("token")) {
    return "请先登录 MSIR Prism，再查看会员权限。";
  }
  return message;
}

function featureEnabled(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["true", "yes", "enabled"].includes(value.toLowerCase());
  return false;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
