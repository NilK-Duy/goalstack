import type { DurationUnit, Goal, Link, Subtask } from '@/types';
import { createId } from './id';

export const STORAGE_KEY = 'goalstack:state';
export const STORAGE_VERSION = 2;

export interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
}

/**
 * The seam between the app and wherever goals live. Everything above this reads
 * and writes `GoalState`, so swapping localStorage for an API later is a new
 * implementation of this interface and nothing else.
 */
export interface GoalRepository {
  load(): GoalState;
  save(state: GoalState): void;
}

export const emptyState: GoalState = { goals: [], activeGoalId: null };

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function normaliseLink(raw: unknown): Link | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  const url = asString(candidate.url);
  if (!url) return null;

  return {
    id: asString(candidate.id) || createId('link'),
    url,
    label: asString(candidate.label) || url,
  };
}

function normaliseSubtask(raw: unknown): Subtask | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  return {
    id: asString(candidate.id) || createId('subtask'),
    title: asString(candidate.title, 'Untitled subtask'),
    weight: Math.max(0, asNumber(candidate.weight, 1)),
    links: Array.isArray(candidate.links)
      ? candidate.links.map(normaliseLink).filter((link): link is Link => link !== null)
      : [],
    notes: asString(candidate.notes),
  };
}

/**
 * Rebuilds a goal from untrusted JSON. Stored state can be hand-edited, left
 * over from an older build, or truncated by a full disk, and a malformed field
 * should cost at most that field rather than the whole app.
 */
function normaliseGoal(raw: unknown): Goal | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;

  const duration = (candidate.duration ?? {}) as Record<string, unknown>;
  const unit: DurationUnit = duration.unit === 'hours' ? 'hours' : 'days';
  const startISO = asString(candidate.startISO);
  const createdAt = asString(candidate.createdAt) || new Date().toISOString();

  return {
    id: asString(candidate.id) || createId('goal'),
    title: asString(candidate.title, 'Untitled goal'),
    startISO: Number.isNaN(new Date(startISO).getTime()) ? new Date().toISOString() : startISO,
    duration: { value: Math.max(0, asNumber(duration.value, 1)), unit },
    subtasks: Array.isArray(candidate.subtasks)
      ? candidate.subtasks.map(normaliseSubtask).filter((st): st is Subtask => st !== null)
      : [],
    createdAt,
    updatedAt: asString(candidate.updatedAt) || createdAt,
  };
}

/**
 * Turns stored JSON back into state, tolerating anything. Exported so the
 * migration and the field-level repair can be tested without touching storage.
 */
export function deserialiseState(serialised: string): GoalState {
  const parsed: unknown = JSON.parse(serialised);
  if (typeof parsed !== 'object' || parsed === null) return emptyState;

  const envelope = parsed as Record<string, unknown>;

  // v1 stored a single goal under `goal`; carry it forward as the active one.
  const rawGoals = Array.isArray(envelope.goals)
    ? envelope.goals
    : envelope.goal
      ? [envelope.goal]
      : [];

  const goals = rawGoals.map(normaliseGoal).filter((goal): goal is Goal => goal !== null);
  const requestedActiveId = asString(envelope.activeGoalId) || null;
  const activeGoalId =
    goals.find((goal) => goal.id === requestedActiveId)?.id ?? goals[0]?.id ?? null;

  return { goals, activeGoalId };
}

/**
 * localStorage-backed repository. Every access is guarded: storage throws on
 * quota overflow and is simply absent in private-mode and SSR contexts, and in
 * all of those cases the app should keep working in memory for the session.
 */
export function createLocalStorageRepository(): GoalRepository {
  const storage = (() => {
    try {
      const probe = '__goalstack_probe__';
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  })();

  return {
    load() {
      if (!storage) return emptyState;
      try {
        const serialised = storage.getItem(STORAGE_KEY);
        return serialised ? deserialiseState(serialised) : emptyState;
      } catch (error) {
        console.warn('GoalStack: could not read saved goals, starting fresh.', error);
        return emptyState;
      }
    },

    save(state) {
      if (!storage) return;
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: STORAGE_VERSION, ...state }),
        );
      } catch (error) {
        console.warn('GoalStack: could not save goals.', error);
      }
    },
  };
}

/** In-memory repository, for tests and for environments without storage. */
export function createMemoryRepository(initial: GoalState = emptyState): GoalRepository {
  let current = initial;
  return {
    load: () => current,
    save: (state) => {
      current = state;
    },
  };
}
