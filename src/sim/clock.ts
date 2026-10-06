/** 1 tick = 1 sim minute. A world carries a clock offset in minutes so a scenario can start at any hour. */
export const TICKS_PER_HOUR = 60;
export const TICKS_PER_DAY = 24 * 60;
export const DEFAULT_START_HOUR = 17;
export const DAYS = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

/** Clock minutes since Friday 00:00 for a tick, given the world's offset. */
export function clockMinutes(tick: number, offsetMinutes = DEFAULT_START_HOUR * 60): number {
  return tick + offsetMinutes;
}

export function formatClock(clockMins: number): string {
  const day = DAYS[Math.floor(clockMins / TICKS_PER_DAY) % 7];
  const inDay = clockMins % TICKS_PER_DAY;
  const hh = String(Math.floor(inDay / 60)).padStart(2, '0');
  const mm = String(inDay % 60).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

/** Kept for callers that still think in the default Friday 17:00 start. */
export function formatTick(tick: number, offsetMinutes = DEFAULT_START_HOUR * 60): string {
  return formatClock(clockMinutes(tick, offsetMinutes));
}

/** Fractional hour of day, 0 to 24. */
export function hourOfDay(clockMins: number): number {
  return (clockMins % TICKS_PER_DAY) / 60;
}

export function dayIndex(clockMins: number): number {
  return Math.floor(clockMins / TICKS_PER_DAY);
}

/** 0 at night, 1 in full day, with dawn 05:00 to 08:00 and dusk 17:00 to 20:00. */
export function daylight(hour: number): number {
  if (hour >= 8 && hour < 17) return 1;
  if (hour >= 5 && hour < 8) return (hour - 5) / 3;
  if (hour >= 17 && hour < 20) return 1 - (hour - 17) / 3;
  return 0;
}

/** True when `hour` falls inside [open, close), where close may be past midnight (e.g. 16 to 1). */
export function withinHours(hour: number, open: number, close: number): boolean {
  if (open === close) return true;
  if (open < close) return hour >= open && hour < close;
  return hour >= open || hour < close;
}

export function formatDuration(ticks: number): string {
  if (ticks < 60) return `${ticks} min`;
  const h = Math.floor(ticks / 60);
  const m = ticks % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''}${h % 24 ? ` ${h % 24} h` : ''}`;
  }
  return m ? `${h} h ${m} min` : `${h} h`;
}
