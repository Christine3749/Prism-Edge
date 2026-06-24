const windows = new Map<string, { count: number; resetsAt: number }>();

// Prune expired windows every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of windows) {
    if (w.resetsAt <= now) windows.delete(key);
  }
}, 300_000).unref();

export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetsAt <= now) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}
