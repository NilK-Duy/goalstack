import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmButtonProps {
  onConfirm(): void;
  /** Description of the destructive action, for screen readers. */
  ariaLabel: string;
  /** Visible text once armed, e.g. "Delete goal". */
  confirmLabel: string;
  icon: ReactNode;
}

/**
 * A destructive action behind a second click.
 *
 * Not `window.confirm`: that blocks the whole page and looks nothing like the
 * app. Not a modal either — a modal for one irreversible click is more
 * ceremony than the decision needs. The armed state disarms itself after a few
 * seconds so a button the user walked away from doesn't stay live, and clicks
 * are stopped from propagating because these sit inside clickable cards.
 */
export function ConfirmButton({ onConfirm, ariaLabel, confirmLabel, icon }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!armed) return;
    disarmTimer.current = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(disarmTimer.current);
  }, [armed]);

  const swallow = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (armed) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={(event) => {
            swallow(event);
            onConfirm();
          }}
          className="gs-btn bg-danger px-2.5 py-1.5 text-xs text-white"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={(event) => {
            swallow(event);
            setArmed(false);
          }}
          className="gs-btn gs-btn-ghost px-2.5 py-1.5 text-xs"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        swallow(event);
        setArmed(true);
      }}
      className="gs-icon-btn gs-icon-btn-danger"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {icon}
    </button>
  );
}
