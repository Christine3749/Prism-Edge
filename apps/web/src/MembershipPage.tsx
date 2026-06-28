import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, Check, Crown, Database, Gauge, LockKeyhole, Settings, ShieldCheck, Sparkles, UserCircle } from "lucide-react";
import { hsFetch, readHsAccessToken } from "@shared/hsAuth";
import Logo from "@ui/Logo";

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
  const token = useMemo(() => readHsAccessToken(), []);

  async function loadMembership() {
    setLoading(true);
    setError("");
    try {
      const response = await hsFetch("/api/membership/me");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.code || "会员状态读取失败。");
      setSnapshot(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会员状态读取失败。");
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
      if (!response.ok) throw new Error(payload.message || payload.code || "开通失败。");
      await loadMembership();
    } catch (err) {
      setError(err instanceof Error ? err.message : "开通失败，请稍后再试。");
    } finally {
      setActivating(false);
    }
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
    <main className="prism-auth-page relative min-h-screen overflow-auto bg-[#030711] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px"
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-400/50" />

      <div className="relative mx-auto min-h-screen w-full max-w-7xl px-5 py-5">
        <header className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <a href="/" className="flex items-center gap-3 text-slate-100 no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/40 bg-slate-950/70 text-cyan-300">
              <Logo className="h-8" showText={false} />
            </div>
            <div>
              <div className="text-sm font-black tracking-wide">MSIR Prism</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Member Center</div>
            </div>
          </a>
          <div className="flex items-center gap-2">
            <a href="/" className="flex h-8 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-xs font-semibold text-slate-300 no-underline hover:border-cyan-500/40 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              返回终端
            </a>
            {!token && (
              <a href="/login" className="flex h-8 items-center rounded-md border border-cyan-500/50 bg-cyan-500 px-3 text-xs font-black text-slate-950 no-underline hover:bg-cyan-300">
                登录
              </a>
            )}
          </div>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/30 text-cyan-300">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">MSIR Prism 账号</div>
                  <div className="truncate text-[11px] text-slate-500">{email}</div>
                </div>
              </div>
            </div>
            <nav className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-sm">
              <SideItem active icon={<UserCircle className="h-4 w-4" />} label="账户信息" />
              <SideItem icon={<ShieldCheck className="h-4 w-4" />} label="我的权限" />
              <SideItem icon={<Crown className="h-4 w-4" />} label="会员方案" />
              <SideItem icon={<Settings className="h-4 w-4" />} label="账户设置" />
            </nav>
          </aside>

          <section className="space-y-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-300">Membership Plane</div>
              <h1 className="prism-auth-title mt-2 text-3xl text-white">MSIR Prism 会员中心</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                普通会员在这里管理 MSIR Prism 权限；内部运营中心负责后台授权、会员运营和高级管理员管理。
              </p>
            </div>

            {!token && <GuestPanel />}
            {error && <div className="rounded-md border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">{error}</div>}
            {loading && <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">正在读取会员状态...</div>}

            {!loading && token && (
              <>
                <div className="grid gap-4 xl:grid-cols-3">
                  <StatusPanel title="当前方案" value={planCode.toUpperCase()} meta={isActive ? "已激活" : "未激活"} icon={<Crown className="h-5 w-5" />} accent={isActive ? "cyan" : "amber"} />
                  <StatusPanel title="产品权限" value="MSIR PRISM" meta={snapshot?.productCode || "msir_prism"} icon={<ShieldCheck className="h-5 w-5" />} accent="cyan" />
                  <StatusPanel title="授权来源" value="HS" meta="后台授权托管" icon={<LockKeyhole className="h-5 w-5" />} accent="slate" />
                </div>

                {!isActive && (
                  <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/30 bg-cyan-950/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-black text-white">还没有 MSIR Prism 会员权限</div>
                      <div className="mt-1 text-sm text-slate-400">可以先开通 Free 方案，后续再升级 Quant Pro。</div>
                    </div>
                    <button
                      type="button"
                      onClick={activateFree}
                      disabled={activating}
                      className="h-10 rounded-md border border-cyan-500/50 bg-cyan-500 px-4 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activating ? "开通中..." : "开通 Free 会员"}
                    </button>
                  </div>
                )}

                <div className="grid gap-4 xl:grid-cols-2">
                  <PermissionCard icon={<Brain className="h-4 w-4" />} title="AI 智能分析" enabled={featureEnabled(features.quant_lab)} detail="K 线解释、趋势判断、关键位推演" />
                  <PermissionCard icon={<Database className="h-4 w-4" />} title="模型注册表" enabled={featureEnabled(features.model_registry)} detail="读取可用量化模型和版本" />
                  <PermissionCard icon={<Gauge className="h-4 w-4" />} title="DGWM Runtime" enabled={featureEnabled(features.runtime_diagnostic)} detail="运行 DGWM 诊断和决策请求" />
                  <PermissionCard icon={<Sparkles className="h-4 w-4" />} title="回测能力" enabled={featureEnabled(features.backtest)} detail="策略回测、权益曲线、回撤分析" />
                </div>

                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
                  <div className="border-b border-slate-800 px-5 py-4">
                    <div className="text-sm font-black text-white">账户信息</div>
                    <div className="mt-1 text-xs text-slate-500">基础资料和授权状态</div>
                  </div>
                  <div className="divide-y divide-slate-800">
                    <InfoRow label="邮箱" value={email} />
                    <InfoRow label="角色" value={snapshot?.role || "guest"} />
                    <InfoRow label="订阅状态" value={snapshot?.subscription?.status || "inactive"} />
                    <InfoRow label="周期结束" value={snapshot?.subscription?.currentPeriodEnd || "-"} />
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

function GuestPanel() {
  return (
    <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-950/70 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <div className="text-lg font-black text-white">请先登录 MSIR Prism</div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          登录后可以查看你的方案等级、量化权限和模型额度。普通会员不会进入内部运营后台。
        </p>
      </div>
      <a href="/login" className="flex h-10 items-center justify-center rounded-md border border-cyan-500/50 bg-cyan-500 px-4 text-sm font-black text-slate-950 no-underline hover:bg-cyan-300">登录会员账号</a>
    </div>
  );
}

function SideItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 ${active ? "bg-slate-900 text-cyan-300" : "text-slate-500"}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatusPanel({ title, value, meta, icon, accent }: { title: string; value: string; meta: string; icon: React.ReactNode; accent: "cyan" | "amber" | "slate" }) {
  const accentClass = accent === "cyan" ? "text-cyan-300 border-cyan-500/30 bg-cyan-950/20" : accent === "amber" ? "text-amber-300 border-amber-500/30 bg-amber-950/20" : "text-slate-300 border-slate-700 bg-slate-900/50";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
      <div className={`mb-5 inline-flex h-9 w-9 items-center justify-center rounded-md border ${accentClass}`}>{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{meta}</div>
    </div>
  );
}

function PermissionCard({ icon, title, detail, enabled }: { icon: React.ReactNode; title: string; detail: string; enabled: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <div className={enabled ? "text-cyan-300" : "text-slate-600"}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="font-bold text-white">{title}</div>
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${enabled ? "border-cyan-500/40 text-cyan-300" : "border-slate-700 text-slate-500"}`}>
            {enabled && <Check className="h-3 w-3" />}
            {enabled ? "Enabled" : "Locked"}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[160px_1fr]">
      <div className="text-slate-500">{label}</div>
      <div className="font-mono text-slate-200">{value}</div>
    </div>
  );
}

function featureEnabled(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["true", "yes", "enabled"].includes(value.toLowerCase());
  return false;
}

