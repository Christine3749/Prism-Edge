import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Crown,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Logo from "@ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.access_token) {
        throw new Error(payload.message || payload.error || "登录失败，请检查账号或密码。");
      }

      window.localStorage.setItem("hs_access_token", payload.access_token);
      window.localStorage.setItem("halfsphere_access_token", payload.access_token);
      if (payload.refresh_token) {
        window.localStorage.setItem("hs_refresh_token", payload.refresh_token);
      }
      window.location.href = "/membership";
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "MSIR Prism 会员登录";
  }, []);

  return (
    <main className="prism-auth-page relative min-h-screen overflow-hidden bg-[#030711] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px"
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-cyan-400/50" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-amber-400/30" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex h-14 items-center justify-between border-b border-slate-800/90">
          <a href="/" className="flex min-w-0 items-center gap-3 text-slate-100 no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-500/40 bg-slate-950/70">
              <Logo className="h-8" showText={false} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">MSIR Prism</span>
                <span className="rounded border border-cyan-700 bg-cyan-950/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">M1+</span>
              </div>
              <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">Edge Trading System</div>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="/membership"
              className="hidden h-8 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-xs font-semibold text-slate-300 no-underline hover:border-cyan-500/40 hover:text-white sm:flex"
            >
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              会员中心
            </a>
            <a
              href="/"
              className="flex h-8 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/80 px-3 text-xs font-semibold text-slate-300 no-underline hover:border-cyan-500/40 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回终端
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:py-10">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded border border-cyan-500/30 bg-cyan-950/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Member Auth Plane
            </div>
            <h1 className="prism-auth-title mt-5 max-w-2xl text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              MSIR Prism 会员登录
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              普通会员在 MSIR Prism 完成登录和权限查看；内部运营、授权管理和高级管理员动作保留在穹弯后台。
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <StatusTile label="AUTH" value="HS LINKED" tone="cyan" icon={<LockKeyhole className="h-4 w-4" />} />
              <StatusTile label="PRODUCT" value="MSIR_PRISM" tone="amber" icon={<ShieldCheck className="h-4 w-4" />} />
              <StatusTile label="SESSION" value="SECURE" tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/70">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Permission Matrix</div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ONLINE
                </div>
              </div>
              <div className="grid gap-px bg-slate-800/80 sm:grid-cols-3">
                <MatrixCell icon={<Sparkles className="h-4 w-4" />} title="AI Analysis" meta="tier scoped" />
                <MatrixCell icon={<Cpu className="h-4 w-4" />} title="DGWM Runtime" meta="quant plan" />
                <MatrixCell icon={<Activity className="h-4 w-4" />} title="Backtest Lab" meta="quota gated" />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-hidden rounded-lg border border-slate-700/90 bg-slate-950/90 shadow-2xl shadow-black/40">
            <div className="border-b border-slate-800 bg-slate-900/70 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Secure Session</div>
                  <div className="mt-2 text-xl font-black text-white">登录会员账号</div>
                </div>
                <div className="rounded border border-cyan-500/30 bg-cyan-950/20 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300">TLS</div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Email</span>
                <div className="flex h-12 items-center rounded-md border border-slate-800 bg-[#070b12] focus-within:border-cyan-500/70">
                  <Mail className="ml-3 h-4 w-4 text-cyan-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-700"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Password</span>
                <div className="flex h-12 items-center rounded-md border border-slate-800 bg-[#070b12] focus-within:border-cyan-500/70">
                  <KeyRound className="ml-3 h-4 w-4 text-cyan-300" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none placeholder:text-slate-700"
                  />
                </div>
              </label>

              {error && (
                <div className="rounded-md border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs leading-5 text-rose-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-between rounded-md border border-cyan-500/60 bg-cyan-400 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? "登录中..." : "进入会员中心"}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1 text-center text-[11px]">
                <a href="/membership" className="rounded-md border border-slate-800 px-3 py-2 text-slate-400 no-underline hover:border-cyan-500/40 hover:text-cyan-200">
                  查看会员方案
                </a>
                <a href="/" className="rounded-md border border-slate-800 px-3 py-2 text-slate-400 no-underline hover:border-cyan-500/40 hover:text-cyan-200">
                  回到交易终端
                </a>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-900/40 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
              MSIR Prism · member access gateway
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function StatusTile({
  label,
  value,
  tone,
  icon
}: {
  label: string;
  value: string;
  tone: "cyan" | "amber" | "emerald";
  icon: React.ReactNode;
}) {
  const toneClass = {
    cyan: "border-cyan-500/25 text-cyan-300",
    amber: "border-amber-500/25 text-amber-300",
    emerald: "border-emerald-500/25 text-emerald-300"
  }[tone];

  return (
    <div className={`rounded-md border bg-slate-950/70 p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-mono text-sm font-black text-slate-100">{value}</div>
    </div>
  );
}

function MatrixCell({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div className="bg-slate-950/80 p-4">
      <div className="mb-3 text-cyan-300">{icon}</div>
      <div className="text-sm font-black text-white">{title}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{meta}</div>
    </div>
  );
}