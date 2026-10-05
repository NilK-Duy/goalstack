import { createContext, useContext } from 'react';

/**
 * Identifies the goal a subtree edits.
 *
 * Store actions all take a goal id, and the components that call them — weight
 * steppers, link rows, the notes field — sit three or four levels below the
 * page that knows it. Threading one unchanging string through every layer would
 * add a prop to components that otherwise have nothing to do with goals.
 *
 * Kept apart from the `<GoalScope>` component so each module exports only
 * components or only helpers, which is what Fast Refresh needs to patch a file
 * instead of reloading the page.
 */
export const GoalIdContext = createContext<string | null>(null);

export function useGoalId(): string {
  const goalId = useContext(GoalIdContext);
  if (goalId === null) {
    throw new Error('useGoalId must be used inside a <GoalScope>.');
  }
  return goalId;
}
