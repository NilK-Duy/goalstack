import { useId, useState } from 'react';
import type { DurationUnit } from '@/types';
import { defaultGoalStart, fromDateTimeInputValue, toDateTimeInputValue } from '@/lib/datetime';
import { useGoalStore } from '@/store/useGoalStore';
import { Modal } from './Modal';
import { UnitToggle } from './UnitToggle';

interface NewGoalDialogProps {
  open: boolean;
  onClose(): void;
  onCreated(goalId: string): void;
}

function NewGoalForm({ onClose, onCreated }: Omit<NewGoalDialogProps, 'open'>) {
  const createGoal = useGoalStore((state) => state.createGoal);
  const fieldId = useId();

  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => toDateTimeInputValue(defaultGoalStart()));
  const [amount, setAmount] = useState('14');
  const [unit, setUnit] = useState<DurationUnit>('days');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
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

    onCreated(
      createGoal({
        title,
        startISO: new Date(startMs).toISOString(),
        duration: { value, unit },
      }),
    );
  };

  return (
    <form onSubmit={submit} noValidate>
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

      <div className="flex justify-end gap-2">
        <button type="button" className="gs-btn gs-btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="gs-btn gs-btn-primary">
          Create goal
        </button>
      </div>
    </form>
  );
}

export function NewGoalDialog({ open, onClose, onCreated }: NewGoalDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New goal"
      description="Subtasks and their weights come next, on the goal's own page."
    >
      {/* Mounted only while open, so every visit starts from empty fields. */}
      {open && <NewGoalForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}
