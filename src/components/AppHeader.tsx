import { Link } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { MonitorIcon, MoonIcon, SunIcon, TargetIcon } from './icons';

const THEME_META = {
  system: { Icon: MonitorIcon, label: 'Theme: system' },
  light: { Icon: SunIcon, label: 'Theme: light' },
  dark: { Icon: MoonIcon, label: 'Theme: dark' },
} as const;

export function AppHeader() {
  const { preference, cycle } = useTheme();
  const { Icon: ThemeIcon, label: themeLabel } = THEME_META[preference];

  return (
    <header className="border-line bg-canvas/85 sticky top-0 z-20 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="mr-auto flex items-center gap-3" aria-label="GoalStack home">
          <span className="bg-accent text-accent-fg flex h-9 w-9 items-center justify-center rounded-xl">
            <TargetIcon size={18} />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold tracking-tight">GoalStack</span>
            <span className="text-subtle block text-xs">Weighted plans, on a timeline</span>
          </span>
        </Link>

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
