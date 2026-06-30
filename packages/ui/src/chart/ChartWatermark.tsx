export function ChartWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-4 bottom-7 z-20 flex origin-bottom-left scale-90 items-center gap-1.5 select-none opacity-70 sm:left-5 sm:scale-95"
      style={{ filter: "drop-shadow(0 2px 1px rgba(0, 0, 0, 0.85))" }}
    >
      <svg
        viewBox="0 0 54 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-auto shrink-0 sm:h-8"
      >
        <defs>
          <linearGradient id="msirWatermarkCyan" x1="3" y1="29" x2="24" y2="3" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b6f91" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="msirWatermarkViolet" x1="49" y1="29" x2="28" y2="3" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="msirWatermarkGlass" x1="27" y1="5" x2="27" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8fafc" stopOpacity="0.9" />
            <stop offset="1" stopColor="#94a3b8" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path d="M4 29V7h9l7 13" stroke="url(#msirWatermarkCyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 29V7h-9l-7 13" stroke="url(#msirWatermarkViolet)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M27 4 14 28h26L27 4Z" fill="url(#msirWatermarkGlass)" stroke="#f8fafc" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 7 23 15" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
        <path d="M31 15h17" stroke="#3b6f91" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
        <path d="M31 15 48 22" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" />
        <circle cx="31" cy="15" r="2" fill="#f8fafc" />
      </svg>
      <div className="flex items-end gap-1.5 leading-none">
        <div className="flex items-baseline gap-1 text-[18px] font-black tracking-normal text-white sm:text-[21px]">
          <span>MSIR</span>
          <span className="text-blue-300/70">Prism</span>
        </div>
        <span className="pb-0.5 text-[8px] font-bold tracking-widest text-slate-300 sm:text-[9px]">
          棱镜先生
        </span>
      </div>
    </div>
  );
}
