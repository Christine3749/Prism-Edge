import { TRANSLATIONS } from "@shared/translations";

type TranslationKey = keyof typeof TRANSLATIONS;

interface ResetConfirmModalProps {
  t: (key: TranslationKey) => string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetConfirmModal({ t, onCancel, onConfirm }: ResetConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[90%] max-w-md bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          {t("resetTitle")}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-5">
          {t("resetContent")}
        </p>
        <div className="flex items-center justify-end gap-3 font-semibold text-xs text-slate-200">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:text-white rounded transition-colors cursor-pointer"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
          >
            {t("confirmResetBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
