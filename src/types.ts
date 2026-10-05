export type DurationUnit = 'days' | 'hours';

/** A reference attached to a subtask. */
export interface Link {
  id: string;
  label: string;
  url: string;
}

/**
 * A unit of work inside a goal. `weight` is relative, not absolute: a subtask
 * with weight 2 gets twice the time of one with weight 1, whatever the goal's
 * total duration happens to be.
 */
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
  /** Instant the goal begins, as an ISO-8601 UTC string. */
  startISO: string;
  duration: Duration;
  /** Order is meaningful: subtasks are scheduled back-to-back in this order. */
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}
