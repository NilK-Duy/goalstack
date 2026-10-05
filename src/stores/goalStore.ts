import { create } from 'zustand';
import type { Goal, Subtask, Link } from '@/types';

// Simple UUID generation for browser
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const STORAGE_KEY = 'goalstack-data';
const STORAGE_VERSION = 1;

interface GoalStoreState {
  goal: Goal | null;
  setGoal: (goal: Goal) => void;
  createGoal: (title: string, startISO: string, value: number, unit: 'days' | 'hours') => void;
  updateGoal: (updates: Partial<Goal>) => void;
  addSubtask: (title: string, weight: number) => void;
  updateSubtask: (id: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (id: string) => void;
  reorderSubtasks: (subtaskIds: string[]) => void;
  addLink: (subtaskId: string, url: string, label: string) => void;
  removeLink: (subtaskId: string, linkId: string) => void;
  updateNotes: (subtaskId: string, notes: string) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearGoal: () => void;
}

// Load from localStorage with error handling
function loadFromLocalStorage(): Goal | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Storage version mismatch, ignoring stored data');
      return null;
    }

    return parsed.goal;
  } catch (e) {
    console.error('Failed to load from storage:', e);
    return null;
  }
}

// Save to localStorage with error handling
function saveToLocalStorage(goal: Goal | null) {
  try {
    if (!goal) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: STORAGE_VERSION,
          goal,
        })
      );
    }
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

export const useGoalStore = create<GoalStoreState>((set) => ({
  goal: null,

  loadFromStorage: () => {
    const goal = loadFromLocalStorage();
    set({ goal });
  },

  saveToStorage: () => {
    set((state) => {
      saveToLocalStorage(state.goal);
      return state;
    });
  },

  setGoal: (goal) => {
    set({ goal });
    saveToLocalStorage(goal);
  },

  createGoal: (title, startISO, value, unit) => {
    const goal: Goal = {
      id: generateId(),
      title,
      startISO,
      duration: { value, unit },
      subtasks: [],
      createdAt: new Date().toISOString(),
    };

    set({ goal });
    saveToLocalStorage(goal);
  },

  updateGoal: (updates) => {
    set((state) => {
      if (!state.goal) return state;

      const updatedGoal = { ...state.goal, ...updates };
      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  addSubtask: (title, weight) => {
    set((state) => {
      if (!state.goal) return state;

      const newSubtask: Subtask = {
        id: generateId(),
        title,
        weight,
        links: [],
        notes: '',
      };

      const updatedGoal = {
        ...state.goal,
        subtasks: [...state.goal.subtasks, newSubtask],
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  updateSubtask: (id, updates) => {
    set((state) => {
      if (!state.goal) return state;

      const updatedGoal = {
        ...state.goal,
        subtasks: state.goal.subtasks.map((st: Subtask) => (st.id === id ? { ...st, ...updates } : st)),
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  deleteSubtask: (id) => {
    set((state) => {
      if (!state.goal) return state;

      const updatedGoal = {
        ...state.goal,
        subtasks: state.goal.subtasks.filter((st: Subtask) => st.id !== id),
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  reorderSubtasks: (subtaskIds) => {
    set((state) => {
      if (!state.goal) return state;

      const subtaskMap = new Map(state.goal.subtasks.map((st: Subtask) => [st.id, st]));
      const reorderedSubtasks = subtaskIds
        .map((id: string) => subtaskMap.get(id))
        .filter((st: Subtask | undefined): st is Subtask => st !== undefined);

      const updatedGoal = {
        ...state.goal,
        subtasks: reorderedSubtasks,
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  addLink: (subtaskId, url, label) => {
    set((state) => {
      if (!state.goal) return state;

      const link: Link = {
        id: generateId(),
        url,
        label,
      };

      const updatedGoal = {
        ...state.goal,
        subtasks: state.goal.subtasks.map((st: Subtask) =>
          st.id === subtaskId ? { ...st, links: [...st.links, link] } : st
        ),
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  removeLink: (subtaskId, linkId) => {
    set((state) => {
      if (!state.goal) return state;

      const updatedGoal = {
        ...state.goal,
        subtasks: state.goal.subtasks.map((st: Subtask) =>
          st.id === subtaskId ? { ...st, links: st.links.filter((l: Link) => l.id !== linkId) } : st
        ),
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  updateNotes: (subtaskId, notes) => {
    set((state) => {
      if (!state.goal) return state;

      const updatedGoal = {
        ...state.goal,
        subtasks: state.goal.subtasks.map((st: Subtask) => (st.id === subtaskId ? { ...st, notes } : st)),
      };

      saveToLocalStorage(updatedGoal);
      return { goal: updatedGoal };
    });
  },

  clearGoal: () => {
    set({ goal: null });
    saveToLocalStorage(null);
  },
}));
