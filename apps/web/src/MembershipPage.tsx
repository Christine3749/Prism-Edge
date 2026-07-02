import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, Crown, Database, Gauge, LockKeyhole, Moon, Settings, ShieldCheck, Sparkles, Sun, UserCircle } from "lucide-react";
import { hsFetch, readHsAccessToken } from "@shared/hsAuth";
import { StorageService } from "@shared/storage";
import type { AppSettings } from "@shared/types";
import Logo from "@ui/Logo";
import { DEFAULT_APP_SETTINGS } from "./config/appDefaults";
import { ErrorPanel, GuestPanel, InfoRow, PermissionCard, SideItem, StatusPanel } from "./MembershipPagePanels";
import { buildMembershipTone, cn, featureEnabled, normalizeMembershipError } from "./MembershipPageTone";

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
