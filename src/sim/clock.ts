/** 1 tick = 1 sim minute. Tick 0 is Friday 17:00. */
export const TICKS_PER_HOUR = 60;
export const START_HOUR = 17;
export const DAYS = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

export function formatTick(tick: number): string {
  const totalMinutes = START_HOUR * 60 + tick;
  const day = DAYS[Math.floor(totalMinutes / (24 * 60)) % 7];
  const minutesInDay = totalMinutes % (24 * 60);
  const hh = String(Math.floor(minutesInDay / 60)).padStart(2, '0');
  const mm = String(minutesInDay % 60).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

export function formatDuration(ticks: number): string {
  if (ticks < 60) return `${ticks} min`;
  const h = Math.floor(ticks / 60);
  const m = ticks % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
