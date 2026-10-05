import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { MonitorIcon, MoonIcon, SunIcon, TargetIcon, TrashIcon } from './icons';

const THEME_META = {
  system: { Icon: MonitorIcon, label: 'Theme: system' },
  light: { Icon: SunIcon, label: 'Theme: light' },
  dark: { Icon: MoonIcon, label: 'Theme: dark' },
} as const;

interface AppHeaderProps {
  canDelete: boolean;
  onDelete(): void;
}

export function AppHeader({ canDelete, onDelete }: AppHeaderProps) {
  const { preference, cycle } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Derived rather than synced in an effect: when the goal goes away the
  // confirm button simply can't be armed, with no extra render to unset it.
  const armed = confirming && canDelete;

  // A destructive action gets a second click rather than a modal, but an armed
  // button shouldn't stay armed forever behind the user's back.
  useEffect(() => {
    if (!armed) return;
    resetTimer.current = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(resetTimer.current);
  }, [armed]);

  const { Icon: ThemeIcon, label: themeLabel } = THEME_META[preference];

  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
        <span className="bg-accent text-accent-fg flex h-9 w-9 items-center justify-center rounded-xl">
          <TargetIcon size={18} />
        </span>
        <div className="mr-auto leading-tight">
          <p className="text-[15px] font-semibold tracking-tight">GoalStack</p>
          <p className="text-subtle text-xs">Weighted plans, on a timeline</p>
        </div>

        {canDelete &&
          (armed ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setConfirming(false);
                }}
                className="gs-btn bg-danger px-3 py-2 text-xs text-white"
              >
                Delete goal
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="gs-btn gs-btn-ghost px-3 py-2 text-xs"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="gs-icon-btn gs-icon-btn-danger"
              aria-label="Delete this goal"
              title="Delete this goal"
            >
              <TrashIcon size={17} />
            </button>
          ))}

        <button
          type="button"
          onClick={cycle}
          className="gs-icon-btn"
          aria-label={`${themeLabel}. Click to change.`}
          title={themeLabel}
        >
          <ThemeIcon size={17} />
        </button>
      </div>
    </header>
  );
}
