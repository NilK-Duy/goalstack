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

interface GoalActions {
  createGoal(input: NewGoalInput, seedSubtasks?: NewSubtaskInput[]): void;
  updateGoal(patch: Partial<Pick<Goal, 'title' | 'startISO' | 'duration'>>): void;
  deleteActiveGoal(): void;

  addSubtask(input: NewSubtaskInput): void;
  updateSubtask(subtaskId: string, patch: Partial<Pick<Subtask, 'title' | 'weight' | 'notes'>>): void;
  removeSubtask(subtaskId: string): void;
  reorderSubtasks(orderedIds: string[]): void;

  addLink(subtaskId: string, link: { label: string; url: string }): void;
  removeLink(subtaskId: string, linkId: string): void;
}

export type GoalStore = GoalState & GoalActions;

const repository: GoalRepository = createLocalStorageRepository();

/**
 * Writes trail the UI by a beat. Notes are typed a character at a time and
 * weights are dragged through a range of values, and each of those is a
 * serialise-plus-write of the whole state; coalescing them keeps typing smooth.
 * A flush on pagehide covers the gap if the tab closes mid-debounce.
 */
const persist = (() => {
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

  return (state: GoalState) => {
    pending = { goals: state.goals, activeGoalId: state.activeGoalId };
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  };
})();

export const useGoalStore = create<GoalStore>((set, get) => {
  /**
   * Applies `recipe` to the active goal, stamps `updatedAt`, and persists.
   * Every mutation funnels through here so no action can forget one of those.
   */
  const mutateActiveGoal = (recipe: (goal: Goal) => Goal) => {
    const { goals, activeGoalId } = get();
    const target = goals.find((goal) => goal.id === activeGoalId);
    if (!target) return;

    const next: GoalState = {
      activeGoalId,
      goals: goals.map((goal) =>
        goal.id === activeGoalId ? { ...recipe(goal), updatedAt: new Date().toISOString() } : goal,
      ),
    };

    set(next);
    persist(next);
  };

  const mutateSubtask = (subtaskId: string, recipe: (subtask: Subtask) => Subtask) =>
    mutateActiveGoal((goal) => ({
      ...goal,
      subtasks: goal.subtasks.map((subtask) =>
        subtask.id === subtaskId ? recipe(subtask) : subtask,
      ),
    }));

  return {
    // Hydrated synchronously so the first paint already has the saved goal —
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

      const next: GoalState = {
        goals: [...get().goals, goal],
        activeGoalId: goal.id,
      };

      set(next);
      persist(next);
    },

    updateGoal(patch) {
      mutateActiveGoal((goal) => ({
        ...goal,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : goal.title,
      }));
    },

    deleteActiveGoal() {
      const { goals, activeGoalId } = get();
      const remaining = goals.filter((goal) => goal.id !== activeGoalId);
      const next: GoalState = {
        goals: remaining,
        activeGoalId: remaining.at(-1)?.id ?? null,
      };

      set(next);
      persist(next);
    },

    addSubtask(input) {
      mutateActiveGoal((goal) => ({
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

    updateSubtask(subtaskId, patch) {
      mutateSubtask(subtaskId, (subtask) => ({
        ...subtask,
        ...patch,
        title: patch.title !== undefined ? patch.title : subtask.title,
      }));
    },

    removeSubtask(subtaskId) {
      mutateActiveGoal((goal) => ({
        ...goal,
        subtasks: goal.subtasks.filter((subtask) => subtask.id !== subtaskId),
      }));
    },

    reorderSubtasks(orderedIds) {
      mutateActiveGoal((goal) => {
        const byId = new Map(goal.subtasks.map((subtask) => [subtask.id, subtask]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((subtask): subtask is Subtask => subtask !== undefined);

        // Keep anything the caller's list didn't mention rather than drop it.
        const missing = goal.subtasks.filter((subtask) => !orderedIds.includes(subtask.id));

        return { ...goal, subtasks: [...reordered, ...missing] };
      });
    },

    addLink(subtaskId, link) {
      mutateSubtask(subtaskId, (subtask) => ({
        ...subtask,
        links: [
          ...subtask.links,
          { id: createId('link'), label: link.label.trim() || link.url, url: link.url },
        ],
      }));
    },

    removeLink(subtaskId, linkId) {
      mutateSubtask(subtaskId, (subtask) => ({
        ...subtask,
        links: subtask.links.filter((existing) => existing.id !== linkId),
      }));
    },
  };
});

/** The goal currently on screen, or null when there is none yet. */
export function useActiveGoal(): Goal | null {
  return useGoalStore((state) => state.goals.find((goal) => goal.id === state.activeGoalId) ?? null);
}
