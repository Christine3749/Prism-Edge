import { useEffect, useState } from "react";
import type { LayoutTier } from "@ui/layoutTier";

function resolveLayoutTier(width: number, height: number): LayoutTier {
  if (width < 1024 || height < 640) return "compact";
  if (width < 1366 || height < 820) return "ultraportable";
  if (width < 1600 || height < 950) return "laptop";
  return "desktop";
}

export function useLayoutTier() {
  const [layoutTier, setLayoutTier] = useState<LayoutTier>(() =>
    resolveLayoutTier(window.innerWidth, window.innerHeight)
  );

  useEffect(() => {
    const updateLayoutTier = () => setLayoutTier(resolveLayoutTier(window.innerWidth, window.innerHeight));
    updateLayoutTier();
    window.addEventListener("resize", updateLayoutTier);
    return () => window.removeEventListener("resize", updateLayoutTier);
  }, []);

  return layoutTier;
}
