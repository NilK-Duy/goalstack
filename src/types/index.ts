export type DurationUnit = 'days' | 'hours';

export interface Link {
  id: string;
  url: string;
  label: string;
}

export interface Subtask {
  id: string;
  title: string;
  weight: number;
  links: Link[];
  notes: string;
}

export interface Duration {
  value: number;
  unit: DurationUnit;
}

export interface Goal {
  id: string;
  title: string;
  startISO: string;
  duration: Duration;
  subtasks: Subtask[];
  createdAt: string;
}

export interface ScheduledSubtask {
  subtaskId: string;
  startISO: string;
  endISO: string;
  durationMs: number;
}

export interface Schedule {
  scheduledSubtasks: ScheduledSubtask[];
  totalDurationMs: number;
}
