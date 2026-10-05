# UI conventions

## Tailwind 4, CSS-first

There is **no `tailwind.config.js`**. Tailwind is wired through
`@tailwindcss/vite` in `vite.config.ts`, and the theme lives in `@theme` in
`src/index.css`. Content scanning is automatic.

If you find yourself writing a config file, you are following a v3 tutorial.
Other v3 habits that do not apply: `@tailwind base/components/utilities`
directives (it is a single `@import 'tailwindcss'`), and PostCSS + autoprefixer.

## Semantic colour tokens

Components never name a colour. They use tokens that resolve differently per
theme, so there are almost no `dark:` variants in the codebase.

| Token | Use |
| ----- | --- |
| `canvas` | Page background |
| `surface` | Card and input background |
| `raised` / `inset` | Slightly forward / recessed panels |
| `line` / `line-strong` | Borders; `-strong` on hover |
| `fg` / `muted` / `subtle` | Primary / secondary / tertiary text |
| `accent` / `accent-fg` / `accent-soft` | Brand, text on brand, tinted background |
| `danger` / `danger-soft` | Destructive |

Used as normal utilities: `bg-surface`, `text-muted`, `border-line`.

The mechanism is `@theme inline` mapping `--color-*` to plain custom properties,
which are then redefined in three places in `src/index.css`: `:root` (light),
`@media (prefers-color-scheme: dark) :root:not([data-theme='light'])`, and
`:root[data-theme='dark']`. `inline` is what makes the utilities resolve at the
use site and follow the cascade.

**Adding a colour** means adding it to all three blocks plus the `@theme` map.
Never inline a hex in a component.

## Component classes

Shared styling lives in `@layer components` in `src/index.css`, so form controls
stay consistent without repeating twelve utilities per input:

`gs-card`, `gs-label`, `gs-input`, `gs-btn` (+ `gs-btn-primary`,
`gs-btn-secondary`, `gs-btn-ghost`), `gs-icon-btn` (+ `gs-icon-btn-danger`),
`gs-chip`, `gs-dialog`.

Use these for anything resembling a card, label, input or button. Layout and
one-off spacing stay as inline utilities.

## Theme switching

`useTheme()` cycles `system → light → dark`, writes `goalstack:theme`, and sets
`data-theme` on `<html>` (removing it for `system`). A bootstrap script in
`index.html` applies the stored value **before first paint** — without it a
dark-mode reload flashes light. Keep them in sync if you rename the key.

## Dialogs

`Modal.tsx` wraps the native `<dialog>` and drives it with `showModal()`. That
provides focus trapping, Escape to dismiss, `inert` on the background, and
top-layer stacking that ignores ancestor `z-index` and `overflow: hidden`.

Rules:

- Never hand-roll an overlay. Use `Modal`.
- `showModal()` on an open dialog throws, as does `close()` on a closed one —
  the effect guards on `dialog.open`.
- Sync state from the `close` event, which fires for Escape and programmatic
  close alike.
- A click whose `target` is the dialog element itself is a backdrop click.
- Mount dialog content only while open (`{open && <Form/>}`) so each visit
  starts from fresh fields.

## Drag and drop

dnd-kit, set up in `TimelineView` and consumed by `TimelineCard` via
`useSortable`.

- Sensors: `PointerSensor` with `activationConstraint: { distance: 6 }` — this
  **must** be nested under `activationConstraint`; a bare `distance` is silently
  ignored. Plus `KeyboardSensor` with `sortableKeyboardCoordinates`.
- `attributes` and `listeners` go on the drag handle, with
  `setActivatorNodeRef`, so the handle is focusable and arrow keys reorder.
- Transform is applied as `translate3d(0, y, 0)` — vertical only, which avoids a
  dependency on `@dnd-kit/modifiers`.
- Order lives in the store. There is no local mirror of the list; a previous
  version synced one by effect and it could drift.
- Cards collapse while dragging, so collision detection stays predictable.

## Expand/collapse

Cards animate open by transitioning `grid-template-rows` between `0fr` and
`1fr`, which needs no height measurement. The collapsed panel keeps `inert` so
its controls stay out of the tab order while remaining in the DOM for the
animation. Pair it with `aria-expanded` and `aria-controls` on the trigger.

## Icons

`src/components/icons.tsx` — inline SVG, 24×24 viewBox, `currentColor`,
`aria-hidden`. Add to this file rather than installing an icon package. Pass
`size` (default 16).

## Accessibility baseline

Non-negotiable, and cheap to maintain:

- Every input has a `<label>`, visible or `sr-only`.
- Icon-only buttons carry `aria-label` (and usually `title`).
- Toggles set `aria-expanded` + `aria-controls`; the unit switcher uses
  `role="radiogroup"` / `role="radio"` + `aria-checked`.
- Validation messages use `role="alert"`; status banners `role="status"`.
- Decorative graphics (the rail, distribution bars) are `aria-hidden`, with the
  same information available as text.
- Never remove the global `:focus-visible` outline.
- `prefers-reduced-motion: reduce` is honoured globally in `index.css`; do not
  add animations that bypass it.

## Patterns worth reusing

- **Destructive actions** use `ConfirmButton` — arms on first click, disarms
  itself after 4 s, and stops click propagation because these sit inside
  clickable cards. Currently on goals only; subtask deletion is immediate.
- **Derive, don't sync.** `ConfirmButton`'s armed state and `AppHeader`'s
  earlier delete state are derived during render rather than reconciled in an
  effect. oxlint's `react(set-state-in-effect)` rule will flag the alternative.
- **Empty states explain the model** rather than just saying "nothing here" —
  see `GoalsListPage` and `TimelineView`.
