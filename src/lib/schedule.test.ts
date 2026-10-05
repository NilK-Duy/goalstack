import { describe, expect, it } from 'vitest';
import type { Goal, Subtask } from '@/types';
import { DAY_MS, HOUR_MS, allocate, buildTimeline, durationToMs } from './schedule';

function subtask(id: string, weight: number): Subtask {
  return { id, title: id, weight, links: [], notes: '' };
}

/**
 * Mid-January, built from local components. Local midnight keeps the
 * day-granularity checks meaningful, and January has no daylight-saving
 * transition in any common zone, so whole-day boundaries stay on midnight
 * wherever the suite runs.
 */
const JANUARY_14 = new Date(2026, 0, 14);

function goal(overrides: Partial<Goal> = {}): Goal {
  const createdAt = JANUARY_14.toISOString();
  return {
    id: 'goal-1',
    title: 'Test goal',
    startISO: createdAt,
    duration: { value: 10, unit: 'days' },
    subtasks: [subtask('a', 1), subtask('b', 1)],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('durationToMs', () => {
  it('converts both units', () => {
    expect(durationToMs({ value: 1, unit: 'days' })).toBe(DAY_MS);
    expect(durationToMs({ value: 2.5, unit: 'days' })).toBe(2.5 * DAY_MS);
    expect(durationToMs({ value: 6, unit: 'hours' })).toBe(6 * HOUR_MS);
  });

  it('floors invalid input to zero instead of producing NaN', () => {
    expect(durationToMs({ value: -5, unit: 'days' })).toBe(0);
    expect(durationToMs({ value: Number.NaN, unit: 'hours' })).toBe(0);
    expect(durationToMs({ value: Number.POSITIVE_INFINITY, unit: 'hours' })).toBe(0);
  });
});

describe('allocate', () => {
  it('splits evenly when weights are equal', () => {
    expect(allocate([1, 1], 10 * DAY_MS)).toEqual([5 * DAY_MS, 5 * DAY_MS]);
  });

  it('splits in proportion to the weights', () => {
    expect(allocate([3, 1], 8 * HOUR_MS)).toEqual([6 * HOUR_MS, 2 * HOUR_MS]);
  });

  it('always sums to exactly the budget, however indivisible', () => {
    for (const weights of [[1, 1, 1], [1, 2, 4, 8], [5, 5, 5, 5, 5, 5, 5], [1, 7, 13]]) {
      for (const budget of [10, 1000, 7 * DAY_MS, 13 * HOUR_MS + 7]) {
        const parts = allocate(weights, budget);
        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(budget);
      }
    }
  });

  it('keeps every slice within 1ms of its ideal share', () => {
    const weights = [2, 3, 5, 2, 1];
    const budget = 31 * DAY_MS + 17;
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    allocate(weights, budget).forEach((part, index) => {
      const ideal = (budget * weights[index]) / totalWeight;
      expect(Math.abs(part - ideal)).toBeLessThan(1);
    });
  });

  it('gives the leftover milliseconds to the largest truncated fractions', () => {
    // 10/3 each: floors to 3,3,3 and the single spare millisecond goes to the
    // first slice, rather than all drift landing on the last one.
    expect(allocate([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(allocate([1, 2], 10)).toEqual([3, 7]);
  });

  it('treats non-positive and non-finite weights as taking no time', () => {
    expect(allocate([1, 0, 1], 10)).toEqual([5, 0, 5]);
    expect(allocate([1, -4, 1], 10)).toEqual([5, 0, 5]);
    expect(allocate([1, Number.NaN], 10)).toEqual([10, 0]);
  });

  it('allocates nothing when there is no weight or no budget', () => {
    expect(allocate([0, 0], 10)).toEqual([0, 0]);
    expect(allocate([1, 1], 0)).toEqual([0, 0]);
    expect(allocate([], 10)).toEqual([]);
  });
});

describe('buildTimeline', () => {
  it('schedules subtasks back-to-back with no gaps', () => {
    const timeline = buildTimeline(goal({ subtasks: [subtask('a', 2), subtask('b', 1), subtask('c', 1)] }));

    expect(timeline.items[0].startMs).toBe(timeline.startMs);
    timeline.items.slice(1).forEach((item, index) => {
      expect(item.startMs).toBe(timeline.items[index].endMs);
    });
    expect(timeline.items.at(-1)!.endMs).toBe(timeline.endMs);
  });

  it('fills the goal exactly, with no overhang or shortfall', () => {
    const timeline = buildTimeline(goal({ subtasks: [subtask('a', 1), subtask('b', 1), subtask('c', 1)] }));
    const scheduled = timeline.items.reduce((sum, item) => sum + item.durationMs, 0);

    expect(scheduled).toBe(timeline.totalMs);
    expect(timeline.endMs - timeline.startMs).toBe(timeline.totalMs);
  });

  it('reports each subtask’s share of the total', () => {
    const timeline = buildTimeline(goal({ subtasks: [subtask('a', 3), subtask('b', 1)] }));

    expect(timeline.items[0].share).toBeCloseTo(0.75, 10);
    expect(timeline.items[1].share).toBeCloseTo(0.25, 10);
    expect(timeline.items.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(1, 10);
  });

  it('numbers positions from one, in list order', () => {
    const timeline = buildTimeline(goal({ subtasks: [subtask('a', 1), subtask('b', 1), subtask('c', 1)] }));
    expect(timeline.items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(timeline.items.map((item) => item.subtask.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles an hours-based goal', () => {
    const timeline = buildTimeline(
      goal({ duration: { value: 8, unit: 'hours' }, subtasks: [subtask('a', 1), subtask('b', 3)] }),
    );

    expect(timeline.totalMs).toBe(8 * HOUR_MS);
    expect(timeline.items[0].durationMs).toBe(2 * HOUR_MS);
    expect(timeline.items[1].durationMs).toBe(6 * HOUR_MS);
  });

  it('returns an empty schedule for a goal with no subtasks', () => {
    const timeline = buildTimeline(goal({ subtasks: [] }));

    expect(timeline.items).toEqual([]);
    expect(timeline.totalWeight).toBe(0);
    expect(timeline.endMs - timeline.startMs).toBe(10 * DAY_MS);
  });

  it('does not throw when every weight is zero, so a half-filled form still renders', () => {
    const timeline = buildTimeline(goal({ subtasks: [subtask('a', 0), subtask('b', 0)] }));

    expect(timeline.totalWeight).toBe(0);
    expect(timeline.items.map((item) => item.durationMs)).toEqual([0, 0]);
    expect(timeline.items.every((item) => item.startMs === timeline.startMs)).toBe(true);
  });

  it('ignores zero-weight subtasks when dividing the time', () => {
    const timeline = buildTimeline(
      goal({ subtasks: [subtask('a', 1), subtask('skipped', 0), subtask('c', 1)] }),
    );

    expect(timeline.items[1].durationMs).toBe(0);
    expect(timeline.items[0].durationMs).toBe(5 * DAY_MS);
    expect(timeline.items[2].durationMs).toBe(5 * DAY_MS);
    // The skipped subtask keeps its place in the sequence as a zero-length slice.
    expect(timeline.items[1].startMs).toBe(timeline.items[1].endMs);
  });

  it('falls back to now when the stored start date is unreadable', () => {
    const before = Date.now();
    const timeline = buildTimeline(goal({ startISO: 'not-a-date' }));

    expect(timeline.startMs).toBeGreaterThanOrEqual(before);
    expect(Number.isNaN(timeline.startMs)).toBe(false);
  });

  describe('granularity', () => {
    it('uses whole days when the goal is in days and every boundary is midnight', () => {
      const timeline = buildTimeline(goal({ subtasks: [subtask('a', 1), subtask('b', 1)] }));
      expect(timeline.granularity).toBe('day');
    });

    it('drops to minutes when the start is not at midnight', () => {
      const start = new Date(2026, 0, 14, 9, 30);
      expect(buildTimeline(goal({ startISO: start.toISOString() })).granularity).toBe('minute');
    });

    it('drops to minutes when a slice is not a whole number of days', () => {
      const timeline = buildTimeline(goal({ subtasks: [subtask('a', 1), subtask('b', 2)] }));
      expect(timeline.granularity).toBe('minute');
    });

    it('always uses minutes for an hours-based goal', () => {
      const timeline = buildTimeline(goal({ duration: { value: 48, unit: 'hours' } }));
      expect(timeline.granularity).toBe('minute');
    });
  });
});
