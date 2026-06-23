import { useEffect, useState } from "react";
import type { Language } from "@shared/translations";

export function useLanguagePreference() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("prism_edge_lang") as Language) || "zh";
  });

  useEffect(() => {
    localStorage.setItem("prism_edge_lang", lang);
  }, [lang]);

  return [lang, setLang] as const;
}
