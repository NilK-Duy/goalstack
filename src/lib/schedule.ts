import type { Duration, DurationUnit, Goal, Subtask } from '@/types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** How precisely a timeline needs to be rendered to stay truthful. */
export type Granularity = 'day' | 'minute';

export interface TimelineItem {
  subtask: Subtask;
  /** 1-based position in the sequence, for display. */
  position: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  /** Fraction of the goal's total duration, 0–1. */
  share: number;
}

export interface Timeline {
  items: TimelineItem[];
  startMs: number;
  endMs: number;
  totalMs: number;
  totalWeight: number;
  granularity: Granularity;
}

export function unitToMs(unit: DurationUnit): number {
  return unit === 'days' ? DAY_MS : HOUR_MS;
}

export function durationToMs(duration: Duration): number {
  const value = Number.isFinite(duration.value) ? Math.max(0, duration.value) : 0;
  return Math.round(value * unitToMs(duration.unit));
}

/**
 * Splits `totalMs` across `weights` proportionally.
 *
 * Uses the largest-remainder method: every slice is floored, then the leftover
 * milliseconds go to the slices with the biggest truncated fractions. This
 * keeps two properties that matter for a timeline — the slices always sum to
 * exactly `totalMs` (no gap or overhang at the end of the goal), and no slice
 * is ever more than 1ms off its ideal share. Naively flooring and dumping the
 * remainder on the last subtask would satisfy the first but not the second.
 *
 * Non-positive and non-finite weights are treated as 0, so a subtask with no
 * weight takes no time rather than poisoning the whole calculation.
 */
export function allocate(weights: number[], totalMs: number): number[] {
  const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const totalWeight = safeWeights.reduce((sum, w) => sum + w, 0);
  const budget = Number.isFinite(totalMs) ? Math.max(0, Math.round(totalMs)) : 0;

  if (totalWeight <= 0 || budget === 0) {
    return safeWeights.map(() => 0);
  }

  const ideal = safeWeights.map((w) => (budget * w) / totalWeight);
  const allocated = ideal.map((value) => Math.floor(value));

  let remainder = budget - allocated.reduce((sum, value) => sum + value, 0);

  // Each floor discards less than 1ms, so the remainder is always smaller than
  // the number of slices and a single pass distributes all of it.
  const byLargestFraction = ideal
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byLargestFraction) {
    if (remainder <= 0) break;
    allocated[index] += 1;
    remainder -= 1;
  }

  return allocated;
}

function isLocalMidnight(ms: number): boolean {
  const date = new Date(ms);
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

/**
 * Picks the coarsest granularity that still describes the schedule exactly.
 *
 * Day-level display is only honest when the goal is measured in days, every
 * slice is a whole number of days, and every boundary lands on local midnight.
 * That last check matters across a daylight-saving change: a 24h slice can end
 * at 23:00 or 01:00 local, and in that case we show times instead of silently
 * rounding to the wrong date.
 */
function resolveGranularity(
  unit: DurationUnit,
  startMs: number,
  items: TimelineItem[],
): Granularity {
  if (unit !== 'days' || !isLocalMidnight(startMs)) return 'minute';

  const everyBoundaryIsAWholeDay = items.every(
    (item) => item.durationMs % DAY_MS === 0 && isLocalMidnight(item.endMs),
  );

  return everyBoundaryIsAWholeDay ? 'day' : 'minute';
}

/**
 * Derives the full schedule for a goal. Pure — the result is never stored, so
 * the goal stays the single source of truth and dates can't go stale.
 *
 * Never throws: an unusable goal (no subtasks, every weight zero) yields a
 * timeline with zero-length slices, which the UI surfaces as a hint. Throwing
 * here would mean a render-time crash for an ordinary half-filled form.
 */
export function buildTimeline(goal: Goal): Timeline {
  const totalMs = durationToMs(goal.duration);
  const parsedStart = new Date(goal.startISO).getTime();
  const startMs = Number.isNaN(parsedStart) ? Date.now() : parsedStart;

  const totalWeight = goal.subtasks.reduce(
    (sum, subtask) => sum + (Number.isFinite(subtask.weight) && subtask.weight > 0 ? subtask.weight : 0),
    0,
  );

  const durations = allocate(
    goal.subtasks.map((subtask) => subtask.weight),
    totalMs,
  );

  let cursor = startMs;
  const items: TimelineItem[] = goal.subtasks.map((subtask, index) => {
    const durationMs = durations[index];
    const item: TimelineItem = {
      subtask,
      position: index + 1,
      startMs: cursor,
      endMs: cursor + durationMs,
      durationMs,
      share: totalMs > 0 ? durationMs / totalMs : 0,
    };
    cursor = item.endMs;
    return item;
  });

  return {
    items,
    startMs,
    endMs: startMs + totalMs,
    totalMs,
    totalWeight,
    granularity: resolveGranularity(goal.duration.unit, startMs, items),
  };
}
