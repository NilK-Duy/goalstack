import type { ReactNode } from 'react';
import { GoalIdContext } from './goalIdContext';

/** Names the goal that everything inside it reads and edits. */
export function GoalScope({ goalId, children }: { goalId: string; children: ReactNode }) {
  return <GoalIdContext.Provider value={goalId}>{children}</GoalIdContext.Provider>;
}
