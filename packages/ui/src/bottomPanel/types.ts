import { TRANSLATIONS } from "../../../shared/src/translations";

export type BottomPanelTab = "book" | "trades" | "news" | "ai";
export type TranslationFn = (key: keyof typeof TRANSLATIONS) => string;
export interface MembershipNotice {
  featureKey: string;
  title: string;
  message: string;
  actionLabel: string;
  href: string;
}
