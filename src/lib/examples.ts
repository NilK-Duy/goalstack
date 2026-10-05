import type { Duration } from '@/types';

/**
 * A plan to start from, so an empty app can show the weighting idea working
 * rather than describing it. Deliberately uneven weights: the point is that
 * "Build the prototype" takes five times what "Polish and hand-off" does.
 *
 * The subtask shape is spelled out rather than imported from the store's
 * `NewSubtaskInput`: `lib/` must not depend on layers above it, and structural
 * typing means this still satisfies `createGoal` at the call site.
 */
export const EXAMPLE_GOAL: {
  title: string;
  duration: Duration;
  subtasks: { title: string; weight: number }[];
} = {
  title: 'Redesign the onboarding flow',
  duration: { value: 21, unit: 'days' },
  subtasks: [
    { title: 'Research and competitive scan', weight: 2 },
    { title: 'Wireframes and copy', weight: 3 },
    { title: 'Build the prototype', weight: 5 },
    { title: 'User testing', weight: 2 },
    { title: 'Polish and hand-off', weight: 1 },
  ],
};
