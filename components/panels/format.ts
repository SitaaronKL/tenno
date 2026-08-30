// Timestamps are ms epoch per lib/contracts/worldstate.ts.
export function countdown(target: number, now: number): string {
  const left = Math.max(0, Math.floor((target - now) / 1000));
  if (left === 0) return "expired";
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
