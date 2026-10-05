import type { Goal, Schedule, ScheduledSubtask, Subtask } from '@/types';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function durationToMs(value: number, unit: 'days' | 'hours'): number {
  if (value < 0) {
    throw new Error('Duration value must be non-negative');
  }
  return unit === 'days' ? value * MS_PER_DAY : value * MS_PER_HOUR;
}

export function msToDuration(ms: number, unit: 'days' | 'hours'): number {
  if (ms < 0) {
    throw new Error('Duration value must be non-negative');
  }
  return unit === 'days' ? ms / MS_PER_DAY : ms / MS_PER_HOUR;
}

export function calculateSchedule(goal: Goal): Schedule {
  const { subtasks, duration, startISO } = goal;

  // Validate duration
  if (duration.value < 0) {
    throw new Error('Duration value must be non-negative');
  }

  if (subtasks.length === 0) {
    return {
      scheduledSubtasks: [],
      totalDurationMs: 0,
    };
  }

  // Validate subtask weights
  const weights = subtasks.map((st: Subtask) => st.weight);
  if (weights.some((w: number) => w < 0)) {
    throw new Error('Subtask weight must be non-negative');
  }

  const sumOfWeights = weights.reduce((sum: number, w: number) => sum + w, 0);
  if (sumOfWeights === 0) {
    throw new Error('Sum of weights cannot be zero');
  }

  const totalDurationMs = durationToMs(duration.value, duration.unit);
  const startDate = new Date(startISO);

  const scheduledSubtasks: ScheduledSubtask[] = [];
  let currentTime = startDate.getTime();

  subtasks.forEach((subtask: Subtask, index: number) => {
    const isLastSubtask = index === subtasks.length - 1;
    let durationMs: number;

    if (isLastSubtask) {
      // Last subtask absorbs any rounding remainder
      durationMs = totalDurationMs - (currentTime - startDate.getTime());
    } else {
      durationMs = Math.floor((totalDurationMs * subtask.weight) / sumOfWeights);
    }

    const startISO = new Date(currentTime).toISOString();
    const endTime = currentTime + durationMs;
    const endISO = new Date(endTime).toISOString();

    scheduledSubtasks.push({
      subtaskId: subtask.id,
      startISO,
      endISO,
      durationMs,
    });

    currentTime = endTime;
  });

  return {
    scheduledSubtasks,
    totalDurationMs,
  };
}

export function formatDateRange(startISO: string, endISO: string, unit: 'days' | 'hours'): string {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (unit === 'days') {
    const startDate = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startDate} – ${endDate}`;
  }

  // For hours, show date and time
  const startStr = start.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

export function getSubtaskPercentage(durationMs: number, totalMs: number): number {
  if (totalMs === 0) return 0;
  return (durationMs / totalMs) * 100;
}
