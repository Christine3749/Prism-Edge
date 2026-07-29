import { useEffect, useRef } from "react";

type DesktopBridge = {
  publishCrosshair?: (payload: DesktopCrosshairPayload) => void;
  onCrosshair?: (handler: (payload: DesktopCrosshairPayload) => void) => () => void;
};

type DesktopCrosshairPayload = {
  symbolId: string;
  time: number | null;
  price: number | null;
};

interface UseDesktopCrosshairSyncParams {
  chartInstance: any | null;
  mainSeries: any | null;
  symbolId: string;
}

export function useDesktopCrosshairSync({ chartInstance, mainSeries, symbolId }: UseDesktopCrosshairSyncParams) {
  const ignoreLocalMoveUntilRef = useRef(0);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop?.publishCrosshair || !desktop.onCrosshair || !chartInstance || !mainSeries) return;

    const handleLocalCrosshairMove = (param: any) => {
      if (Date.now() < ignoreLocalMoveUntilRef.current) return;
      if (!param?.point || param.time === undefined) {
        desktop.publishCrosshair({ symbolId, time: null, price: null });
        return;
      }

      const now = Date.now();
      if (now - lastSentAtRef.current < 32) return;
      lastSentAtRef.current = now;

      const price = resolveCrosshairPrice(param, mainSeries);
      if (!Number.isFinite(price)) return;
      desktop.publishCrosshair({ symbolId, time: Number(param.time), price });
    };

    const unsubscribeRemote = desktop.onCrosshair((payload) => {
      if (payload.symbolId !== symbolId) return;
      ignoreLocalMoveUntilRef.current = Date.now() + 80;
      if (!Number.isFinite(payload.time) || !Number.isFinite(payload.price)) {
        chartInstance.clearCrosshairPosition?.();
        return;
      }
      chartInstance.setCrosshairPosition(Number(payload.price), Number(payload.time), mainSeries);
    });

    chartInstance.subscribeCrosshairMove(handleLocalCrosshairMove);
    return () => {
      chartInstance.unsubscribeCrosshairMove(handleLocalCrosshairMove);
      unsubscribeRemote?.();
    };
  }, [chartInstance, mainSeries, symbolId]);
}

function getDesktopBridge(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { prismDesktop?: DesktopBridge }).prismDesktop;
}

function resolveCrosshairPrice(param: any, mainSeries: any) {
  const seriesValue = param.seriesData?.get?.(mainSeries);
  if (seriesValue && typeof seriesValue === "object") {
    if ("close" in seriesValue) return Number(seriesValue.close);
    if ("value" in seriesValue) return Number(seriesValue.value);
  }

  if (param.point && typeof mainSeries.coordinateToPrice === "function") {
    return Number(mainSeries.coordinateToPrice(param.point.y));
  }

  return NaN;
}
