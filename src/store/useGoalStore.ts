import { create } from 'zustand';
import type { Duration, Goal, Subtask } from '@/types';
import { createId } from '@/lib/id';
import {
  createLocalStorageRepository,
  type GoalRepository,
  type GoalState,
} from '@/lib/storage';

export interface NewGoalInput {
  title: string;
  startISO: string;
  duration: Duration;
}

export interface NewSubtaskInput {
  title: string;
  weight: number;
}

/**
 * Every mutation names the goal it applies to. There is no "current goal" in
 * the store — the route owns that — so an action can't be aimed at whatever
 * happened to be selected last.
 */
interface GoalActions {
  /** Returns the new goal's id so the caller can navigate to it. */
  createGoal(input: NewGoalInput, seedSubtasks?: NewSubtaskInput[]): string;
  updateGoal(goalId: string, patch: Partial<Pick<Goal, 'title' | 'startISO' | 'duration'>>): void;
  deleteGoal(goalId: string): void;

  addSubtask(goalId: string, input: NewSubtaskInput): void;
  updateSubtask(
    goalId: string,
    subtaskId: string,
    patch: Partial<Pick<Subtask, 'title' | 'weight' | 'notes'>>,
  ): void;
  removeSubtask(goalId: string, subtaskId: string): void;
  reorderSubtasks(goalId: string, orderedIds: string[]): void;

  addLink(goalId: string, subtaskId: string, link: { label: string; url: string }): void;
  removeLink(goalId: string, subtaskId: string, linkId: string): void;
}

export type GoalStore = GoalState & GoalActions;

/**
 * Writes trail the UI by a beat. Notes are typed a character at a time and
 * weights are dragged through a range of values, and each of those is a
 * serialise-plus-write of the whole state; coalescing them keeps typing smooth.
 * A flush on pagehide covers the gap if the tab closes mid-debounce.
 */
function createDebouncedWriter(repository: GoalRepository) {
  const DEBOUNCE_MS = 200;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: GoalState | undefined;

  const flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (pending) {
      repository.save(pending);
      pending = undefined;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  return { write: (state: GoalState) => {
    pending = { goals: state.goals };
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }, flush };
}

/**
 * Builds a store over the given repository. Exported as a factory so tests can
 * drive it against an in-memory repository instead of the browser's storage.
 */
export function createGoalStore(repository: GoalRepository) {
  const persist = createDebouncedWriter(repository);

  return create<GoalStore>((set, get) => {
    /**
     * Applies `recipe` to one goal, stamps `updatedAt`, and persists. Every
     * mutation funnels through here so none can forget either step, and an
     * unknown id is a no-op rather than a crash — a stale route or a second
     * tab can both ask for a goal that is already gone.
     */
    const mutateGoal = (goalId: string, recipe: (goal: Goal) => Goal) => {
      const { goals } = get();
      if (!goals.some((goal) => goal.id === goalId)) return;

      const next: GoalState = {
        goals: goals.map((goal) =>
          goal.id === goalId ? { ...recipe(goal), updatedAt: new Date().toISOString() } : goal,
        ),
      };

      set(next);
      persist.write(next);
    };

    const mutateSubtask = (
      goalId: string,
      subtaskId: string,
      recipe: (subtask: Subtask) => Subtask,
    ) =>
      mutateGoal(goalId, (goal) => ({
        ...goal,
        subtasks: goal.subtasks.map((subtask) =>
          subtask.id === subtaskId ? recipe(subtask) : subtask,
        ),
      }));

    return {
      // Hydrated synchronously so the first paint already has the saved goals —
      // loading in an effect would flash the empty state on every reload.
      ...repository.load(),

      createGoal(input, seedSubtasks = []) {
        const now = new Date().toISOString();
        const goal: Goal = {
          id: createId('goal'),
          title: input.title.trim(),
          startISO: input.startISO,
          duration: input.duration,
          subtasks: seedSubtasks.map((seed) => ({
            id: createId('subtask'),
            title: seed.title.trim(),
            weight: seed.weight,
            links: [],
            notes: '',
          })),
          createdAt: now,
          updatedAt: now,
        };

        const next: GoalState = { goals: [...get().goals, goal] };
        set(next);
        persist.write(next);

        return goal.id;
      },

      updateGoal(goalId, patch) {
        mutateGoal(goalId, (goal) => ({
          ...goal,
          ...patch,
          title: patch.title !== undefined ? patch.title.trim() : goal.title,
        }));
      },

      deleteGoal(goalId) {
        const next: GoalState = { goals: get().goals.filter((goal) => goal.id !== goalId) };
        set(next);
        persist.write(next);
      },

      addSubtask(goalId, input) {
        mutateGoal(goalId, (goal) => ({
          ...goal,
          subtasks: [
            ...goal.subtasks,
            {
              id: createId('subtask'),
              title: input.title.trim(),
              weight: input.weight,
              links: [],
              notes: '',
            },
          ],
        }));
      },

      updateSubtask(goalId, subtaskId, patch) {
        mutateSubtask(goalId, subtaskId, (subtask) => ({ ...subtask, ...patch }));
      },

      removeSubtask(goalId, subtaskId) {
        mutateGoal(goalId, (goal) => ({
          ...goal,
          subtasks: goal.subtasks.filter((subtask) => subtask.id !== subtaskId),
        }));
      },

      reorderSubtasks(goalId, orderedIds) {
        mutateGoal(goalId, (goal) => {
          const byId = new Map(goal.subtasks.map((subtask) => [subtask.id, subtask]));
          const reordered = orderedIds
            .map((id) => byId.get(id))
            .filter((subtask): subtask is Subtask => subtask !== undefined);

          // Keep anything the caller's list didn't mention rather than drop it.
          const missing = goal.subtasks.filter((subtask) => !orderedIds.includes(subtask.id));

          return { ...goal, subtasks: [...reordered, ...missing] };
        });
      },

      addLink(goalId, subtaskId, link) {
        mutateSubtask(goalId, subtaskId, (subtask) => ({
          ...subtask,
          links: [
            ...subtask.links,
            { id: createId('link'), label: link.label.trim() || link.url, url: link.url },
          ],
        }));
      },

      removeLink(goalId, subtaskId, linkId) {
        mutateSubtask(goalId, subtaskId, (subtask) => ({
          ...subtask,
          links: subtask.links.filter((existing) => existing.id !== linkId),
        }));
      },
    };
  });
}

export const useGoalStore = createGoalStore(createLocalStorageRepository());

/**
 * One goal by id, or null. Selecting the goal object itself keeps the reference
 * stable between renders; building a new object in the selector would make
 * every store write look like a change.
 */
export function useGoal(goalId: string | undefined): Goal | null {
  return useGoalStore((state) => state.goals.find((goal) => goal.id === goalId) ?? null);
}
