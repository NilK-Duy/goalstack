import { describe, expect, it } from 'vitest';
import { defaultGoalStart, fromDateTimeInputValue, toDateTimeInputValue } from './datetime';

describe('datetime-local round trip', () => {
  it('reads back the exact wall-clock time it wrote', () => {
    const original = new Date(2026, 9, 5, 9, 30).getTime();
    expect(fromDateTimeInputValue(toDateTimeInputValue(original))).toBe(original);
  });

  it('formats with zero-padded parts', () => {
    expect(toDateTimeInputValue(new Date(2026, 0, 3, 7, 5).getTime())).toBe('2026-01-03T07:05');
  });

  it('interprets the value as local time, not UTC', () => {
    const parsed = fromDateTimeInputValue('2026-10-05T14:00');
    expect(parsed).not.toBeNull();

    const asLocal = new Date(parsed!);
    expect(asLocal.getHours()).toBe(14);
    expect(asLocal.getMinutes()).toBe(0);
    expect(asLocal.getDate()).toBe(5);
  });
});

describe('fromDateTimeInputValue', () => {
  it('accepts a value with seconds appended', () => {
    expect(fromDateTimeInputValue('2026-10-05T14:00:00')).toBe(
      new Date(2026, 9, 5, 14, 0).getTime(),
    );
  });

  it('rejects dates that do not exist rather than rolling them over', () => {
    expect(fromDateTimeInputValue('2026-02-31T10:00')).toBeNull();
    expect(fromDateTimeInputValue('2026-13-01T10:00')).toBeNull();
  });

  it('rejects anything that is not a datetime-local value', () => {
    expect(fromDateTimeInputValue('')).toBeNull();
    expect(fromDateTimeInputValue('tomorrow')).toBeNull();
    expect(fromDateTimeInputValue('2026-10-05')).toBeNull();
  });
});

describe('defaultGoalStart', () => {
  it('is 09:00 local today', () => {
    const start = new Date(defaultGoalStart());
    const now = new Date();

    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
    expect(start.getDate()).toBe(now.getDate());
  });
});
