import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EXAMPLE_GOAL } from '@/lib/examples';
import { defaultGoalStart } from '@/lib/datetime';
import { useGoalStore } from '@/store/useGoalStore';
import { GoalListCard } from '@/components/GoalListCard';
import { NewGoalDialog } from '@/components/NewGoalDialog';
import { PlusIcon, TargetIcon } from '@/components/icons';

export function GoalsListPage() {
  const goals = useGoalStore((state) => state.goals);
  const createGoal = useGoalStore((state) => state.createGoal);
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Most recently touched first. Sorting here rather than in a store selector
  // keeps the selector returning the stable `goals` reference.
  const ordered = useMemo(
    () => [...goals].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [goals],
  );

  const openCreated = (goalId: string) => {
    setDialogOpen(false);
    navigate(`/goals/${goalId}`);
  };

  const loadExample = () => {
    openCreated(
      createGoal(
        {
          title: EXAMPLE_GOAL.title,
          startISO: new Date(defaultGoalStart()).toISOString(),
          duration: EXAMPLE_GOAL.duration,
        },
        EXAMPLE_GOAL.subtasks,
      ),
    );
  };

  return (
    <div className="py-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Goals</h1>
          {goals.length > 0 && (
            <p className="text-muted mt-0.5 text-sm">
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="gs-btn gs-btn-primary shrink-0"
        >
          <PlusIcon size={15} />
          New goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="border-line rounded-2xl border border-dashed px-6 py-14 text-center">
          <span className="bg-accent-soft text-accent mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl">
            <TargetIcon size={22} />
          </span>
          <p className="text-sm font-semibold">No goals yet</p>
          <p className="text-muted mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">
            A goal is a start date, a total duration, and the weighted subtasks that fill it.
            GoalStack turns those into a timeline with dates for each step.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="gs-btn gs-btn-primary"
            >
              <PlusIcon size={15} />
              New goal
            </button>
            <button type="button" onClick={loadExample} className="gs-btn gs-btn-secondary">
              Load an example plan
            </button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3">
          {ordered.map((goal) => (
            <GoalListCard key={goal.id} goal={goal} />
          ))}
        </ul>
      )}

      <NewGoalDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={openCreated}
      />
    </div>
  );
}
