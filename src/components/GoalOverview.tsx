import { useId, useState } from 'react';
import type { DurationUnit, Goal } from '@/types';
import type { Timeline } from '@/lib/schedule';
import { formatEnd, formatGoalDuration, formatInstant } from '@/lib/format';
import { fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/datetime';
import { useGoalStore } from '@/store/useGoalStore';
import { ConfirmButton } from './ConfirmButton';
import { PencilIcon, TrashIcon } from './icons';
import { UnitToggle } from './UnitToggle';

interface GoalOverviewProps {
  goal: Goal;
  timeline: Timeline;
  onDeleted(): void;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-subtle text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

export function GoalOverview({ goal, timeline, onDeleted }: GoalOverviewProps) {
  const updateGoal = useGoalStore((state) => state.updateGoal);
  const deleteGoal = useGoalStore((state) => state.deleteGoal);
  const fieldId = useId();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [start, setStart] = useState(() => toDateTimeInputValue(timeline.startMs));
  const [amount, setAmount] = useState(String(goal.duration.value));
  const [unit, setUnit] = useState<DurationUnit>(goal.duration.unit);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    // Re-seed from the goal each time, so a cancelled edit leaves no residue.
    setTitle(goal.title);
    setStart(toDateTimeInputValue(timeline.startMs));
    setAmount(String(goal.duration.value));
    setUnit(goal.duration.unit);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    if (!title.trim()) {
      setError('The goal needs a name.');
      return;
    }
    const startMs = fromDateTimeInputValue(start);
    if (startMs === null) {
      setError('That start date is not a real date.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Total duration needs to be greater than zero.');
      return;
    }

    updateGoal(goal.id, {
      title,
      startISO: new Date(startMs).toISOString(),
      duration: { value, unit },
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <form
        className="gs-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        noValidate
      >
        <div className="mb-4">
          <label className="gs-label" htmlFor={`${fieldId}-title`}>
            Goal
          </label>
          <input
            id={`${fieldId}-title`}
            className="gs-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
          />
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="gs-label" htmlFor={`${fieldId}-start`}>
              Starts
            </label>
            <input
              id={`${fieldId}-start`}
              type="datetime-local"
              className="gs-input"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="gs-label" htmlFor={`${fieldId}-amount`}>
                Duration
              </label>
              <input
                id={`${fieldId}-amount`}
                type="number"
                inputMode="decimal"
                min="0.5"
                step="0.5"
                className="gs-input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div>
              <span className="gs-label">Unit</span>
              <UnitToggle value={unit} onChange={setUnit} />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-danger mb-3 text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="submit" className="gs-btn gs-btn-primary">
            Save changes
          </button>
          <button
            type="button"
            className="gs-btn gs-btn-ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="gs-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <h1 className="flex-1 text-xl font-semibold tracking-tight break-words sm:text-2xl">
          {goal.title}
        </h1>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={open}
            className="gs-icon-btn"
            aria-label="Edit goal details"
            title="Edit goal details"
          >
            <PencilIcon size={16} />
          </button>
          <ConfirmButton
            onConfirm={() => {
              deleteGoal(goal.id);
              onDeleted();
            }}
            ariaLabel="Delete this goal"
            confirmLabel="Delete goal"
            icon={<TrashIcon size={16} />}
          />
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Starts" value={formatInstant(timeline.startMs, timeline.granularity)} />
        <Stat label="Ends" value={formatEnd(timeline.endMs, timeline.granularity)} />
        <Stat
          label="Total"
          value={formatGoalDuration(goal.duration.value, goal.duration.unit)}
        />
        <Stat
          label="Subtasks"
          value={`${goal.subtasks.length}${
            timeline.totalWeight > 0 ? ` · ${timeline.totalWeight} wt` : ''
          }`}
        />
      </dl>
    </section>
  );
}
