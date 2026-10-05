import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatEnd,
  formatGoalDuration,
  formatInstant,
  formatRange,
  formatShare,
} from './format';
import { DAY_MS, HOUR_MS, MINUTE_MS } from './schedule';

/**
 * Dates are built from local components and compared against locally built
 * Intl output, so the suite says nothing about the runner's locale or zone —
 * only about the logic layered on top of the formatters.
 */
const dayOf = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(ms);

const JAN_14 = new Date(2026, 0, 14).getTime();

describe('formatDuration', () => {
  it('shows the two largest non-zero units', () => {
    expect(formatDuration(5 * DAY_MS)).toBe('5d');
    expect(formatDuration(2 * DAY_MS + 6 * HOUR_MS)).toBe('2d 6h');
    expect(formatDuration(3 * HOUR_MS + 30 * MINUTE_MS)).toBe('3h 30m');
    expect(formatDuration(45 * MINUTE_MS)).toBe('45m');
    expect(formatDuration(2 * DAY_MS + 6 * HOUR_MS + 13 * MINUTE_MS)).toBe('2d 6h');
  });

  it('describes durations too small to show as a unit', () => {
    expect(formatDuration(1200)).toBe('<1m');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-1)).toBe('0m');
    expect(formatDuration(Number.NaN)).toBe('0m');
  });
});

describe('formatShare', () => {
  it('rounds whole percentages and keeps precision on small ones', () => {
    expect(formatShare(0.5)).toBe('50%');
    expect(formatShare(0.333)).toBe('33%');
    expect(formatShare(0.0642)).toBe('6.4%');
    expect(formatShare(0.004)).toBe('<1%');
    expect(formatShare(0)).toBe('0%');
  });
});

describe('formatGoalDuration', () => {
  it('agrees with the unit in number', () => {
    expect(formatGoalDuration(1, 'days')).toBe('1 day');
    expect(formatGoalDuration(14, 'days')).toBe('14 days');
    expect(formatGoalDuration(1, 'hours')).toBe('1 hour');
    expect(formatGoalDuration(2.5, 'hours')).toBe('2.5 hours');
  });
});

describe('formatRange at day granularity', () => {
  it('shows the last occupied day, not the midnight after it', () => {
    const end = JAN_14 + 5 * DAY_MS;

    // Five days from the 14th occupy the 14th through the 18th.
    expect(formatRange(JAN_14, end, 'day')).toBe(`${dayOf(JAN_14)} – ${dayOf(JAN_14 + 4 * DAY_MS)}`);
    expect(formatRange(JAN_14, end, 'day')).not.toContain(dayOf(end));
  });

  it('collapses a single day to one date', () => {
    expect(formatRange(JAN_14, JAN_14 + DAY_MS, 'day')).toBe(dayOf(JAN_14));
  });

  it('falls back to the start for an empty interval', () => {
    expect(formatRange(JAN_14, JAN_14, 'day')).toBe(formatInstant(JAN_14, 'day'));
  });
});

describe('formatRange at minute granularity', () => {
  it('drops the repeated date inside one day', () => {
    const start = new Date(2026, 0, 14, 9, 0).getTime();
    const formatted = formatRange(start, start + 4 * HOUR_MS + 30 * MINUTE_MS, 'minute');

    expect(formatted).toContain(dayOf(start));
    // The date appears once; only the two clock times are separated by the dash.
    expect(formatted.split(dayOf(start))).toHaveLength(2);
    expect(formatted).toContain('–');
  });

  it('names both dates when the range crosses midnight', () => {
    const start = new Date(2026, 0, 14, 22, 0).getTime();
    const end = start + 6 * HOUR_MS;

    const formatted = formatRange(start, end, 'minute');
    expect(formatted).toContain(dayOf(start));
    expect(formatted).toContain(dayOf(end));
  });
});

describe('formatEnd', () => {
  it('reports the inclusive last day at day granularity', () => {
    const end = JAN_14 + 5 * DAY_MS;
    expect(formatEnd(end, 'day')).toBe(formatInstant(JAN_14 + 4 * DAY_MS, 'day'));
  });

  it('reports the exact instant at minute granularity', () => {
    const end = new Date(2026, 0, 14, 13, 30).getTime();
    expect(formatEnd(end, 'minute')).toBe(formatInstant(end, 'minute'));
  });
});
