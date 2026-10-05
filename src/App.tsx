import { useMemo } from 'react';
import { buildTimeline } from '@/lib/schedule';
import { useActiveGoal, useGoalStore } from '@/store/useGoalStore';
import { AppHeader } from '@/components/AppHeader';
import { GoalOverview } from '@/components/GoalOverview';
import { GoalSetupForm } from '@/components/GoalSetupForm';
import { TimelineView } from '@/components/TimelineView';

export default function App() {
  const goal = useActiveGoal();
  const deleteActiveGoal = useGoalStore((state) => state.deleteActiveGoal);

  // The schedule is derived, never stored, so dates cannot fall out of step
  // with the weights, order or duration they came from.
  const timeline = useMemo(() => (goal ? buildTimeline(goal) : null), [goal]);

  return (
    <div className="min-h-svh">
      <AppHeader canDelete={goal !== null} onDelete={deleteActiveGoal} />

      <main className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {goal && timeline ? (
          <div className="grid gap-5 py-6 sm:py-8">
            <GoalOverview goal={goal} timeline={timeline} />
            <TimelineView goal={goal} timeline={timeline} />
          </div>
        ) : (
          <GoalSetupForm />
        )}
      </main>
    </div>
  );
}
