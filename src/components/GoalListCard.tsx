import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Goal } from '@/types';
import { buildTimeline } from '@/lib/schedule';
import { formatEnd, formatGoalDuration, formatInstant } from '@/lib/format';
import { useGoalStore } from '@/store/useGoalStore';
import { ConfirmButton } from './ConfirmButton';
import { ChevronIcon, TrashIcon } from './icons';

/**
 * The weighting at a glance: one segment per subtask, sized by its share of
 * the goal. Decorative — the counts beneath it carry the same information as
 * text, so it is hidden from assistive tech rather than described twice.
 */
function DistributionBar({ shares }: { shares: number[] }) {
  if (shares.length === 0) {
    return <div className="bg-inset h-1.5 w-full rounded-full" aria-hidden="true" />;
  }

  return (
    <div className="bg-inset flex h-1.5 w-full gap-px overflow-hidden rounded-full" aria-hidden="true">
      {shares.map((share, index) => (
        <span
          key={index}
          className="bg-accent h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${share * 100}%`,
            // Alternating weight keeps neighbouring segments distinguishable
            // without introducing a second hue.
            opacity: 1 - (index % 3) * 0.28,
          }}
        />
      ))}
    </div>
  );
}

export function GoalListCard({ goal }: { goal: Goal }) {
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const timeline = useMemo(() => buildTimeline(goal), [goal]);

  const scheduled = timeline.items.filter((item) => item.durationMs > 0).length;

  return (
    <li>
      <Link
        to={`/goals/${goal.id}`}
        className="gs-card group hover:border-line-strong block p-4 transition-all hover:-translate-y-0.5
          hover:shadow-float"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{goal.title}</h3>
            <p className="text-muted mt-1 text-xs">
              {formatInstant(timeline.startMs, timeline.granularity)}
              <span className="text-subtle"> → </span>
              {formatEnd(timeline.endMs, timeline.granularity)}
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-1">
            <ConfirmButton
              onConfirm={() => deleteGoal(goal.id)}
              ariaLabel={`Delete goal ${goal.title}`}
              confirmLabel="Delete"
              icon={<TrashIcon size={16} />}
            />
            <span className="text-subtle group-hover:text-fg -rotate-90 transition-colors">
              <ChevronIcon size={16} />
            </span>
          </span>
        </div>

        <DistributionBar shares={timeline.items.map((item) => item.share)} />

        <p className="text-subtle mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted font-medium">
            {formatGoalDuration(goal.duration.value, goal.duration.unit)}
          </span>
          <span aria-hidden="true">·</span>
          {goal.subtasks.length === 0 ? (
            <span>No subtasks yet</span>
          ) : (
            <span>
              {goal.subtasks.length} {goal.subtasks.length === 1 ? 'subtask' : 'subtasks'}
              {scheduled < goal.subtasks.length && ` · ${goal.subtasks.length - scheduled} unweighted`}
            </span>
          )}
        </p>
      </Link>
    </li>
  );
}
