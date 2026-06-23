import type { IndicatorConfig } from "../../../shared/src/types";

export type IndicatorChangeHandler = (
  indicator: keyof IndicatorConfig,
  field: string,
  value: any
) => void;
