import type { Duration } from '@/types';
import type { NewSubtaskInput } from '@/store/useGoalStore';

/**
 * A plan to start from, so an empty app can show the weighting idea working
 * rather than describing it. Deliberately uneven weights: the point is that
 * "Build the prototype" takes five times what "Polish and hand-off" does.
 */
export const EXAMPLE_GOAL: {
  title: string;
  duration: Duration;
  subtasks: NewSubtaskInput[];
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
