export function clampSignalMetric(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(4, Math.min(96, value));
}

export function formatCompactStat(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const units = [
    { suffix: "T", divisor: 1_000_000_000_000 },
    { suffix: "B", divisor: 1_000_000_000 },
    { suffix: "M", divisor: 1_000_000 },
    { suffix: "K", divisor: 1_000 }
  ];
  const unit = units.find((item) => value >= item.divisor);
  if (!unit) return value.toFixed(value >= 100 ? 0 : 1);
  const scaled = value / unit.divisor;
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)}${unit.suffix}`;
}

export function formatDeskPrice(price: number, precision: number) {
  if (!Number.isFinite(price) || price <= 0) return "--";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: Math.min(Math.max(precision, 2), 6)
  });
}

export function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}
