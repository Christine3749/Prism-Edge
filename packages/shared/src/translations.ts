import { AI_TRANSLATIONS } from "./i18n/analysis";
import { CORE_TRANSLATIONS } from "./i18n/core";
import { DRAWING_TRANSLATIONS } from "./i18n/drawing";
import { SETTINGS_TRANSLATIONS } from "./i18n/settings";

export type Language = "en" | "zh" | "tc";

export const TRANSLATIONS = {
  ...CORE_TRANSLATIONS,
  ...SETTINGS_TRANSLATIONS,
  ...AI_TRANSLATIONS,
  ...DRAWING_TRANSLATIONS
} as const;

export function useTranslation(lang: Language) {
  return function t(key: keyof typeof TRANSLATIONS): string {
    const translation = TRANSLATIONS[key];
    if (!translation) return String(key);
    return translation[lang] || translation.zh;
  };
}
