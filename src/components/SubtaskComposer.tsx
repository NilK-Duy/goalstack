import { useId, useRef, useState } from 'react';
import { useGoalStore } from '@/store/useGoalStore';
import { useGoalId } from '@/store/goalIdContext';
import { PlusIcon } from './icons';

/**
 * Always-visible add row rather than a dialog: building a plan means entering
 * five or ten of these in a burst, and focus stays in the title field after
 * each one so the whole list can be typed without reaching for the mouse.
 */
export function SubtaskComposer() {
  const goalId = useGoalId();
  const addSubtask = useGoalStore((state) => state.addSubtask);
  const fieldId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('1');

  const parsedWeight = Number(weight);
  const weightIsValid = Number.isFinite(parsedWeight) && parsedWeight >= 0;
  const canSubmit = title.trim().length > 0 && weightIsValid;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    addSubtask(goalId, { title, weight: parsedWeight });
    setTitle('');
    titleRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="gs-card p-3">
      <div className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
        <div className="min-w-[12rem] flex-1">
          <label className="sr-only" htmlFor={`${fieldId}-title`}>
            Subtask title
          </label>
          <input
            id={`${fieldId}-title`}
            ref={titleRef}
            className="gs-input"
            placeholder="Add a subtask…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="w-20">
          <label
            className="text-subtle mb-1 block text-center text-[11px] font-medium"
            htmlFor={`${fieldId}-weight`}
          >
            Weight
          </label>
          <input
            id={`${fieldId}-weight`}
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className="gs-input text-center tabular-nums"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>

        <button type="submit" className="gs-btn gs-btn-primary" disabled={!canSubmit}>
          <PlusIcon size={15} />
          Add
        </button>
      </div>
    </form>
  );
}
