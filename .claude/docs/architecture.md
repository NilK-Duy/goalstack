# Architecture

## Layers

Dependencies point downward only. A violation is a bug, not a style issue.

```
pages/          route components, one per URL
  ↓
components/     presentational + interactive UI
  ↓
store/          Zustand store, goal-id context
  ↓
lib/            pure logic — no React, no DOM, no store
  ↓
types.ts        data model
```

`src/lib/**` must stay importable from a Node test with no DOM. If you need a
browser API there, it belongs behind a guard (see `storage.ts`) or in a hook.

## File map

| Path | Responsibility |
| ---- | -------------- |
| `src/main.tsx` | Mounts React, wraps `App` in `BrowserRouter`. |
| `src/App.tsx` | Header + `<Routes>`. The only place routes are declared. |
| `src/pages/GoalsListPage.tsx` | `/` — goal list, New-goal dialog trigger, example seeding. |
| `src/pages/GoalDetailPage.tsx` | `/goals/:goalId` — resolves the param, provides `GoalScope`. |
| `src/components/GoalListCard.tsx` | One goal in the list; links to its page. |
| `src/components/GoalOverview.tsx` | Goal summary + inline edit + delete. |
| `src/components/TimelineView.tsx` | dnd-kit context, the rail, empty/unweighted states. |
| `src/components/TimelineCard.tsx` | One sortable, expandable subtask card. |
| `src/components/SubtaskDetails.tsx` | Expanded panel: rename, links, notes. |
| `src/components/SubtaskComposer.tsx` | Persistent add-subtask row. |
| `src/components/Modal.tsx` | Native `<dialog>` wrapper. |
| `src/components/ConfirmButton.tsx` | Two-step destructive action. |
| `src/components/icons.tsx` | Inline SVG icon set. |
| `src/lib/schedule.ts` | Weight → duration allocation, timeline construction. |
| `src/lib/format.ts` | Durations, date ranges, percentage shares. |
| `src/lib/datetime.ts` | `datetime-local` ↔ instant, in local time. |
| `src/lib/storage.ts` | `GoalRepository`, localStorage impl, deserialisation. |
| `src/lib/url.ts` | Link validation and host display. |
| `src/lib/id.ts` | Prefixed ids (`goal_`, `subtask_`, `link_`). |
| `src/lib/examples.ts` | The "load an example plan" seed data. |
| `src/store/useGoalStore.ts` | Store factory + the app's singleton + `useGoal`. |
| `src/store/goalIdContext.ts` | `GoalIdContext`, `useGoalId`. |
| `src/store/GoalScope.tsx` | The provider component. |
| `src/hooks/useTheme.ts` | Light/dark/system preference. |
| `src/index.css` | Tailwind import, theme tokens, component classes. |

## Routing

Declared in `src/App.tsx`:

| Path | Element | Notes |
| ---- | ------- | ----- |
| `/` | `GoalsListPage` | Always valid. |
| `/goals/:goalId` | `GoalDetailPage` | Redirects to `/` if the id is unknown. |
| `*` | `<Navigate to="/" replace />` | Stale or mistyped links. |

`BrowserRouter`, so production hosting needs a single-page rewrite (serve
`index.html` for unmatched paths). `vite dev` and `vite preview` already do.

**The URL is the only record of which goal is open.** `GoalDetailPage` reads
`useParams()`, looks the goal up, and renders `<Navigate to="/" replace />` when
it is missing — which covers a bookmarked link to a deleted goal and the moment
just after a delete. Do not add a selected-goal field anywhere.

## Data flow

One direction, every time:

```
localStorage ──load()──▶ store (hydrated synchronously at module init)
                            │
                            ├─ useGoalStore(selector) ──▶ components
                            │
component event ──action(goalId, …)──▶ store ──▶ debounced save() ──▶ localStorage
```

Then, during render:

```
goal ──buildTimeline()──▶ Timeline { items, startMs, endMs, totalMs, granularity }
```

`buildTimeline` is called in `useMemo` keyed on the goal object, in
`GoalDetailPage` (full timeline) and `GoalListCard` (summary only). Because the
store replaces the goal object on every edit, the memo invalidates exactly when
it should.

Hydration is synchronous at module init, not in an effect, so the first paint
already shows saved goals instead of flashing the empty state.

## Goal scope

Store actions take an explicit `goalId`. The components that call them —
`WeightStepper`, `LinkRow`, the notes field — are three or four levels below the
page that knows it, so the id travels by context:

```tsx
<GoalScope goalId={goal.id}>   {/* GoalDetailPage */}
  …
  const goalId = useGoalId();  {/* any descendant */}
```

`useGoalId` throws outside a `GoalScope`. That is deliberate: a component that
edits a goal must be mounted under one. `GoalListCard` does **not** use it — it
already has `goal.id` as a prop and calls `deleteGoal(goal.id)` directly.

## Where to add things

| Task | Do this |
| ---- | ------- |
| New page | Component in `pages/`, route in `App.tsx`. |
| New derived value from a goal | Pure function in `lib/`, with a test. Do not store it. |
| New field on a goal/subtask | See [state_management.md](state_management.md) — needs a `types.ts` change, a `normalise*` branch, and a `STORAGE_VERSION` bump. |
| New store action | See [state_management.md](state_management.md#adding-an-action). |
| Shared UI primitive | A component class in `src/index.css` if it is pure styling; a component in `components/` if it has behaviour. |
| Something that needs `window` | A hook in `hooks/`, or a guarded module in `lib/`. Never an unguarded call in `lib/`. |
