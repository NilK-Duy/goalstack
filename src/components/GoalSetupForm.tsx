import { useId, useState } from 'react';
import type { DurationUnit } from '@/types';
import { defaultGoalStart, fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/datetime';
import { useGoalStore, type NewSubtaskInput } from '@/store/useGoalStore';
import { TargetIcon } from './icons';
import { UnitToggle } from './UnitToggle';

const EXAMPLE_SUBTASKS: NewSubtaskInput[] = [
  { title: 'Research and competitive scan', weight: 2 },
  { title: 'Wireframes and copy', weight: 3 },
  { title: 'Build the prototype', weight: 5 },
  { title: 'User testing', weight: 2 },
  { title: 'Polish and hand-off', weight: 1 },
];

export function GoalSetupForm() {
  const createGoal = useGoalStore((state) => state.createGoal);
  const fieldId = useId();

  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => toDateTimeInputValue(defaultGoalStart()));
  const [amount, setAmount] = useState('14');
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [error, setError] = useState<string | null>(null);

  const submit = (seeds: NewSubtaskInput[] = []) => {
    const trimmedTitle = title.trim() || (seeds.length > 0 ? 'Redesign the onboarding flow' : '');
    if (!trimmedTitle) {
      setError('Give the goal a name first.');
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

    createGoal(
      {
        title: trimmedTitle,
        startISO: new Date(startMs).toISOString(),
        duration: { value, unit },
      },
      seeds,
    );
  };

  return (
    <div className="mx-auto max-w-xl py-10 sm:py-16">
      <div className="mb-8 text-center">
        <span className="bg-accent-soft text-accent mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl">
          <TargetIcon size={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Plan a goal</h1>
        <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
          Set a start and a total duration. Add subtasks with relative weights and GoalStack splits
          the time between them, in order, as a timeline.
        </p>
      </div>

      <form
        className="gs-card p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
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
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder="Ship the mobile redesign"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="gs-label" htmlFor={`${fieldId}-start`}>
            Starts
          </label>
          <input
            id={`${fieldId}-start`}
            type="datetime-local"
            className="gs-input"
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
              setError(null);
            }}
          />
        </div>

        <div className="mb-5 grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="gs-label" htmlFor={`${fieldId}-amount`}>
              Total duration
            </label>
            <input
              id={`${fieldId}-amount`}
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              className="gs-input"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
            />
          </div>
          <div>
            <span className="gs-label">Unit</span>
            <UnitToggle value={unit} onChange={setUnit} />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-danger mb-4 text-sm">
            {error}
          </p>
        )}

        <button type="submit" className="gs-btn gs-btn-primary w-full">
          Create goal
        </button>
      </form>

      <p className="text-subtle mt-5 text-center text-sm">
        Not sure yet?{' '}
        <button
          type="button"
          onClick={() => submit(EXAMPLE_SUBTASKS)}
          className="text-accent cursor-pointer font-medium underline decoration-dotted underline-offset-4"
        >
          Load an example plan
        </button>
      </p>
    </div>
  );
}
