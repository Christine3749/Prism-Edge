import { useEffect, useState } from "react";
import type { LayoutTier } from "@ui/layoutTier";

export function resolveLayoutTier(width: number, height: number): LayoutTier {
  if (width < 1024 || height < 640) return "compact";
  // Keep the common 13-inch (1366×768) and 14-inch (1536×864) viewports
  // in the same tier. The old 820px height cutoff made the whole terminal
  // jump between two layouts even though the screens are only one size apart.
  if (width < 1280 || height < 700) return "ultraportable";
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
