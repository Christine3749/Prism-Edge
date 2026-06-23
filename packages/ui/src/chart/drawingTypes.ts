import type { DrawingPoint } from "../../../shared/src/types";

export interface ChartCoordinate {
  x: number;
  y: number;
}

export type CoordinateResolver = (point: DrawingPoint) => ChartCoordinate | null;
