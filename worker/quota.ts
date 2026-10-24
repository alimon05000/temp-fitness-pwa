export type Quota = {
  minute: number;
  minuteCount: number;
  day: number;
  dayCount: number;
};
export function consumeQuota(
  previous: Quota | undefined,
  now = Date.now(),
): { allowed: boolean; next: Quota } {
  const minute = Math.floor(now / 60000),
    day = Math.floor(now / 86400000);
  const next = {
    minute,
    minuteCount: previous?.minute === minute ? previous.minuteCount : 0,
    day,
    dayCount: previous?.day === day ? previous.dayCount : 0,
  };
  if (next.minuteCount >= 5 || next.dayCount >= 50)
    return { allowed: false, next };
  next.minuteCount++;
  next.dayCount++;
  return { allowed: true, next };
}
