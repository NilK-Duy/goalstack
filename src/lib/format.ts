import { DAY_MS, HOUR_MS, MINUTE_MS, type Granularity } from './schedule';

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dayWithYearFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekdayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function isSameLocalDay(a: number, b: number): boolean {
  const left = new Date(a);
  const right = new Date(b);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDay(ms: number): string {
  const sameYear = new Date(ms).getFullYear() === new Date().getFullYear();
  return (sameYear ? dayFormat : dayWithYearFormat).format(ms);
}

/** A date with its weekday, for headline use: "Mon, Oct 5". */
export function formatDayWithWeekday(ms: number): string {
  return weekdayFormat.format(ms);
}

/** A single point in time, rendered at the timeline's granularity. */
export function formatInstant(ms: number, granularity: Granularity): string {
  if (granularity === 'day') return formatDayWithWeekday(ms);
  return `${formatDay(ms)}, ${timeFormat.format(ms)}`;
}

/**
 * The closing boundary of a half-open interval, as a person would say it.
 * At day granularity that is the last day the work occupies, not the midnight
 * after it — "ends Oct 18" rather than "ends Oct 19".
 */
export function formatEnd(endMs: number, granularity: Granularity): string {
  return formatInstant(granularity === 'day' ? endMs - 1 : endMs, granularity);
}

/**
 * Renders a half-open interval [start, end) the way a person reads a calendar.
 *
 * At day granularity the end is shown inclusively — a 5-day slice starting
 * Oct 5 reads "Oct 5 – Oct 9", not "Oct 5 – Oct 10", because it occupies the
 * 5th through the 9th. At minute granularity a range inside one day drops the
 * repeated date: "Oct 5, 9:00 AM – 1:30 PM".
 */
export function formatRange(startMs: number, endMs: number, granularity: Granularity): string {
  if (endMs <= startMs) return formatInstant(startMs, granularity);

  if (granularity === 'day') {
    const inclusiveEnd = endMs - 1;
    if (isSameLocalDay(startMs, inclusiveEnd)) return formatDay(startMs);
    return `${formatDay(startMs)} – ${formatDay(inclusiveEnd)}`;
  }

  const start = `${formatDay(startMs)}, ${timeFormat.format(startMs)}`;
  if (isSameLocalDay(startMs, endMs)) return `${start} – ${timeFormat.format(endMs)}`;
  return `${start} – ${formatDay(endMs)}, ${timeFormat.format(endMs)}`;
}

/**
 * A compact human duration: "5d", "2d 6h", "3h 30m", "45m".
 * Shows at most the two largest non-zero units — "2d 6h" is more readable than
 * "2d 6h 13m" and the exact boundaries are already on the card.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';

  const parts: string[] = [];
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) return '<1m';
  return parts.slice(0, 2).join(' ');
}

/** A share of the total, 0–1, as a percentage string. */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%';
  const percent = share * 100;
  if (percent < 1) return '<1%';
  return `${percent < 10 ? percent.toFixed(1) : Math.round(percent)}%`;
}

/** Formats a goal's total duration the way the user entered it: "10 days". */
export function formatGoalDuration(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const singular = unit.replace(/s$/, '');
  return `${rounded} ${rounded === 1 ? singular : `${singular}s`}`;
}
