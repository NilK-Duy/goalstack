import type { DurationUnit } from '@/types';

const UNITS: { value: DurationUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' },
];

interface UnitToggleProps {
  value: DurationUnit;
  onChange(unit: DurationUnit): void;
}

export function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div
      className="bg-inset border-line flex gap-1 rounded-xl border p-1"
      role="radiogroup"
      aria-label="Duration unit"
    >
      {UNITS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg bg-transparent'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
