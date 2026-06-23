import { TRANSLATIONS } from "../../../shared/src/translations";

export type BottomPanelTab = "book" | "trades" | "news" | "ai";
export type TranslationFn = (key: keyof typeof TRANSLATIONS) => string;
