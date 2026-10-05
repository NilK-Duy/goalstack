import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { buildTimeline } from '@/lib/schedule';
import { useGoal } from '@/store/useGoalStore';
import { GoalScope } from '@/store/GoalScope';
import { GoalOverview } from '@/components/GoalOverview';
import { TimelineView } from '@/components/TimelineView';
import { ChevronIcon } from '@/components/icons';

export function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const goal = useGoal(goalId);
  const navigate = useNavigate();

  // The schedule is derived, never stored, so dates cannot fall out of step
  // with the weights, order or duration they came from.
  const timeline = useMemo(() => (goal ? buildTimeline(goal) : null), [goal]);

  // A bookmarked or shared link can name a goal this browser doesn't have, and
  // deleting one leaves the route pointing at nothing. Either way, go to the
  // list rather than render an error page.
  if (!goal || !timeline) return <Navigate to="/" replace />;

  return (
    <GoalScope goalId={goal.id}>
      <div className="py-6 sm:py-8">
        <Link
          to="/"
          className="text-muted hover:text-fg mb-4 inline-flex items-center gap-1 text-sm
            font-medium transition-colors"
        >
          <span className="rotate-90">
            <ChevronIcon size={15} />
          </span>
          All goals
        </Link>

        <div className="grid gap-5">
          <GoalOverview
            goal={goal}
            timeline={timeline}
            onDeleted={() => navigate('/', { replace: true })}
          />
          <TimelineView goal={goal} timeline={timeline} />
        </div>
      </div>
    </GoalScope>
  );
}
