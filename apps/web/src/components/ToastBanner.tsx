interface ToastBannerProps {
  message: string;
}

export function ToastBanner({ message }: ToastBannerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 bg-slate-900 border border-cyan-500/40 rounded-lg shadow-2xl text-xs text-cyan-400 select-none animate-in slide-in-from-bottom-4 duration-200">
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
      <span className="font-medium text-slate-100">{message}</span>
    </div>
  );
}
