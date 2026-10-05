# GoalStack

Plan a goal by weight. Set a start and a total duration, add subtasks with
relative weights, and GoalStack divides the time between them in order and lays
them out as a timeline with start and end dates. Each subtask is an expandable
card that holds links and notes.

Everything is stored in the browser — no account, no server.

## Screens

| Route             | What it is                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| `/`               | All goals, newest edit first. **New goal** opens a dialog for the details.   |
| `/goals/:goalId`  | One goal: its summary, and the timeline of weighted subtasks.                |

The route owns which goal is on screen, so a goal's page is linkable and
reloadable, and back/forward work as expected. Nothing in storage records a
"current goal" — that would be a second source of truth able to disagree with
the URL.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script          | Does                                  |
| --------------- | ------------------------------------- |
| `npm run dev`   | Dev server with hot reload            |
| `npm run build` | Typecheck, then production build      |
| `npm test`      | Vitest (add `--run` for a single pass) |
| `npm run lint`  | oxlint                                |

## How the time is divided

Weights are relative, not absolute. A subtask of weight 3 gets three times the
time of one with weight 1, whatever the goal's total happens to be; change the
total and every slice rescales.

Slices are laid out **sequentially** — each one starts where the previous ended,
so reordering the list reschedules everything below it. `days` means 24-hour
days and `hours` means continuous clock hours, both measured from the start
instant.

Two details worth knowing:

- **The slices always sum to exactly the goal's duration.** `allocate` in
  [`src/lib/schedule.ts`](src/lib/schedule.ts) uses the largest-remainder
  method, so no slice is more than 1ms off its ideal share and there is no gap
  or overhang at the end. Flooring each slice and dumping the drift on the last
  subtask would hide the error in one place instead.
- **Dates are shown at the coarsest granularity that is still exact.** A goal in
  whole days starting at midnight reads `Oct 5 – Oct 9`; anything else — an
  hours goal, a fractional slice, or a daylight-saving shift that moves a
  boundary off midnight — falls back to showing times rather than rounding to a
  date that is subtly wrong. End dates are inclusive: five days from the 5th
  occupy the 5th through the 9th.

A subtask with weight 0 keeps its place in the sequence as a zero-length slice,
so you can park something without deleting it.

## Layout

```
src/
  lib/          pure logic, each with a .test.ts beside it
    schedule.ts   weight → duration allocation, timeline construction
    format.ts     durations, date ranges, shares
    datetime.ts   datetime-local ↔ instant, in local time
    url.ts        link validation (http/https only)
    storage.ts    GoalRepository + localStorage implementation
  store/
    useGoalStore.ts   Zustand store, the single source of truth
    goalIdContext.ts  which goal a subtree edits
  pages/        one per route
  components/   UI
  types.ts
```

The schedule is **derived, never stored**. `buildTimeline(goal)` is a pure
function called during render, so dates can't fall out of step with the weights,
order or duration they came from. Storage sits behind a `GoalRepository`
interface, so replacing localStorage with an API is one new implementation —
and `createGoalStore(repository)` is exported for that reason, which is also how
the store's tests run against memory instead of the browser.

Every store action names the goal it applies to (`addSubtask(goalId, …)`), so
no mutation can be aimed at whatever happened to be selected last, and an
unknown id is a no-op rather than a crash. The components that call those
actions sit several levels below the page that knows the id, so it travels by
context (`useGoalId`) rather than as a prop through every layer.

## Notes on the implementation

- **Theme** follows the OS by default and can be pinned to light or dark. Colour
  is addressed through semantic tokens (`bg-surface`, `text-muted`) defined once
  in [`src/index.css`](src/index.css), so neither palette is spelled out in a
  component.
- **Reordering** uses dnd-kit with both pointer and keyboard sensors; the drag
  handle is focusable and arrow keys move a card. The store holds the order, so
  there is no local copy of the list to drift out of sync.
- **Stored state is treated as untrusted.** It can be hand-edited or left over
  from an older build, so it is rebuilt field by field on load and a bad value
  costs that field rather than the app.
- **Writes are debounced** by 200ms and flushed on `pagehide`, so typing notes
  doesn't serialise the whole state on every keystroke.
- **The new-goal dialog is a native `<dialog>`** opened with `showModal()`,
  which brings focus trapping, Escape to dismiss, `inert` on the page behind it
  and top-layer stacking without a focus-management implementation of our own.

## Deploying

`npm run build` emits a static `dist/`. Because routes are real paths rather
than hashes, a static host needs the usual single-page rewrite — serve
`index.html` for any unmatched path — or a deep link like `/goals/goal_abc` will
404 on reload. `npm run dev` and `npm run preview` already do this.
