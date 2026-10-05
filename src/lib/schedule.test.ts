import { describe, it, expect, beforeEach } from 'vitest';
import {
  durationToMs,
  msToDuration,
  calculateSchedule,
  formatDateRange,
  getSubtaskPercentage,
} from './schedule';
import type { Goal } from '@/types';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

describe('schedule', () => {
  describe('durationToMs', () => {
    it('converts days to milliseconds', () => {
      expect(durationToMs(1, 'days')).toBe(MS_PER_DAY);
      expect(durationToMs(7, 'days')).toBe(7 * MS_PER_DAY);
      expect(durationToMs(0.5, 'days')).toBe(0.5 * MS_PER_DAY);
    });

    it('converts hours to milliseconds', () => {
      expect(durationToMs(1, 'hours')).toBe(MS_PER_HOUR);
      expect(durationToMs(24, 'hours')).toBe(24 * MS_PER_HOUR);
      expect(durationToMs(0.5, 'hours')).toBe(0.5 * MS_PER_HOUR);
    });

    it('throws on negative duration', () => {
      expect(() => durationToMs(-1, 'days')).toThrow('Duration value must be non-negative');
      expect(() => durationToMs(-1, 'hours')).toThrow('Duration value must be non-negative');
    });
  });

  describe('msToDuration', () => {
    it('converts milliseconds to days', () => {
      expect(msToDuration(MS_PER_DAY, 'days')).toBe(1);
      expect(msToDuration(7 * MS_PER_DAY, 'days')).toBe(7);
    });

    it('converts milliseconds to hours', () => {
      expect(msToDuration(MS_PER_HOUR, 'hours')).toBe(1);
      expect(msToDuration(24 * MS_PER_HOUR, 'hours')).toBe(24);
    });
  });

  describe('calculateSchedule', () => {
    let baseGoal: Goal;

    beforeEach(() => {
      baseGoal = {
        id: 'goal-1',
        title: 'Test Goal',
        startISO: '2026-10-05T00:00:00Z',
        duration: { value: 10, unit: 'days' },
        subtasks: [
          { id: 'st-1', title: 'Subtask 1', weight: 1, links: [], notes: '' },
          { id: 'st-2', title: 'Subtask 2', weight: 1, links: [], notes: '' },
        ],
        createdAt: '2026-10-05T00:00:00Z',
      };
    });

    it('calculates schedule with equal weights', () => {
      const schedule = calculateSchedule(baseGoal);

      expect(schedule.scheduledSubtasks).toHaveLength(2);
      expect(schedule.totalDurationMs).toBe(10 * MS_PER_DAY);

      const st1 = schedule.scheduledSubtasks[0];
      const st2 = schedule.scheduledSubtasks[1];

      expect(st1.subtaskId).toBe('st-1');
      expect(st2.subtaskId).toBe('st-2');

      // Each should get 5 days worth
      expect(st1.durationMs).toBe(5 * MS_PER_DAY);
      expect(st2.durationMs).toBe(5 * MS_PER_DAY);

      // Check times are sequential
      const end1 = new Date(st1.endISO).getTime();
      const start2 = new Date(st2.startISO).getTime();

      expect(end1).toBe(start2);
    });

    it('calculates schedule with different weights', () => {
      baseGoal.subtasks[0].weight = 2;
      baseGoal.subtasks[1].weight = 1;

      const schedule = calculateSchedule(baseGoal);
      const st1 = schedule.scheduledSubtasks[0];
      const st2 = schedule.scheduledSubtasks[1];

      // st1 should get 2/3, st2 should get 1/3
      const expectedSt1 = (10 * MS_PER_DAY * 2) / 3;
      const expectedSt2 = 10 * MS_PER_DAY - Math.floor(expectedSt1);

      expect(st1.durationMs).toBe(Math.floor(expectedSt1));
      expect(st2.durationMs).toBe(expectedSt2);
    });

    it('handles single subtask', () => {
      baseGoal.subtasks = [{ id: 'st-1', title: 'Only Task', weight: 1, links: [], notes: '' }];

      const schedule = calculateSchedule(baseGoal);

      expect(schedule.scheduledSubtasks).toHaveLength(1);
      const st = schedule.scheduledSubtasks[0];

      expect(st.durationMs).toBe(10 * MS_PER_DAY);
      // Start time should be at the goal start
      expect(new Date(st.startISO).getTime()).toBe(new Date(baseGoal.startISO).getTime());
    });

    it('handles empty subtasks', () => {
      baseGoal.subtasks = [];

      const schedule = calculateSchedule(baseGoal);

      expect(schedule.scheduledSubtasks).toHaveLength(0);
      expect(schedule.totalDurationMs).toBe(0);
    });

    it('throws on zero sum of weights', () => {
      baseGoal.subtasks[0].weight = 0;
      baseGoal.subtasks[1].weight = 0;

      expect(() => calculateSchedule(baseGoal)).toThrow('Sum of weights cannot be zero');
    });

    it('throws on negative weight', () => {
      baseGoal.subtasks[0].weight = -1;

      expect(() => calculateSchedule(baseGoal)).toThrow('Subtask weight must be non-negative');
    });

    it('throws on negative goal duration', () => {
      baseGoal.duration.value = -1;

      expect(() => calculateSchedule(baseGoal)).toThrow('Duration value must be non-negative');
    });

    it('handles hours mode', () => {
      baseGoal.duration = { value: 24, unit: 'hours' };

      const schedule = calculateSchedule(baseGoal);

      expect(schedule.totalDurationMs).toBe(24 * MS_PER_HOUR);
      const st1 = schedule.scheduledSubtasks[0];
      const st2 = schedule.scheduledSubtasks[1];

      expect(st1.durationMs).toBe(12 * MS_PER_HOUR);
      expect(st2.durationMs).toBe(12 * MS_PER_HOUR);
    });

    it('absorbs rounding remainder in last subtask', () => {
      baseGoal.duration = { value: 10, unit: 'days' };
      baseGoal.subtasks = [
        { id: 'st-1', title: 'Task 1', weight: 1, links: [], notes: '' },
        { id: 'st-2', title: 'Task 2', weight: 1, links: [], notes: '' },
        { id: 'st-3', title: 'Task 3', weight: 1, links: [], notes: '' },
      ];

      const schedule = calculateSchedule(baseGoal);
      const totalAllocated = schedule.scheduledSubtasks.reduce((sum: number, st: any) => sum + st.durationMs, 0);

      expect(totalAllocated).toBe(10 * MS_PER_DAY);
    });

    it('maintains sequential ordering', () => {
      const schedule = calculateSchedule(baseGoal);

      for (let i = 0; i < schedule.scheduledSubtasks.length - 1; i++) {
        const current = schedule.scheduledSubtasks[i];
        const next = schedule.scheduledSubtasks[i + 1];

        const currentEnd = new Date(current.endISO).getTime();
        const nextStart = new Date(next.startISO).getTime();

        expect(currentEnd).toBe(nextStart);
      }
    });
  });

  describe('formatDateRange', () => {
    it('formats days range', () => {
      const start = '2026-10-05T00:00:00Z';
      const end = '2026-10-15T00:00:00Z';

      const formatted = formatDateRange(start, end, 'days');
      expect(formatted).toMatch(/Oct 5 – Oct 15/);
    });

    it('formats hours range with times', () => {
      const start = '2026-10-05T09:00:00Z';
      const end = '2026-10-05T17:00:00Z';

      const formatted = formatDateRange(start, end, 'hours');
      expect(formatted).toContain(':');
    });
  });

  describe('getSubtaskPercentage', () => {
    it('calculates percentage correctly', () => {
      expect(getSubtaskPercentage(5 * MS_PER_DAY, 10 * MS_PER_DAY)).toBe(50);
      expect(getSubtaskPercentage(2 * MS_PER_DAY, 10 * MS_PER_DAY)).toBe(20);
    });

    it('returns 0 when total is 0', () => {
      expect(getSubtaskPercentage(5, 0)).toBe(0);
    });
  });
});
