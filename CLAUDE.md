# CLAUDE.md

Routing file. Read the relevant `.claude/docs/` file before changing code in
that domain — this file deliberately contains no implementation detail.

## Project Overview

GoalStack is a browser-only weighted goal planner. A goal has a start instant
and a total duration (days or hours); its subtasks carry relative effort
weights, and the app divides the duration between them in list order to produce
a timeline with a start and end for each subtask. Each subtask is an expandable
card holding links and plain-text notes. There is no backend and no account —
all state lives in `localStorage`.

## Tech Stack

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| UI         | React 19 + TypeScript 6 (strict)                    |
| Build/dev  | Vite 8, `@vitejs/plugin-react`                      |
| Styling    | Tailwind CSS 4 via `@tailwindcss/vite` (CSS-first)  |
| Routing    | react-router-dom 7 (`BrowserRouter`)                |
| State      | Zustand 5                                           |
| Drag/drop  | dnd-kit (`core` 6, `sortable` 10, `utilities` 3)    |
| Tests      | Vitest 5, `environment: 'node'`                     |
| Lint       | oxlint 1                                            |

No CSS-in-JS, no component library, no icon package — icons are inline SVG in
`src/components/icons.tsx`.

## Dev Commands

```bash
npm install          # Node 20.19+ / 22.12+ (Vite 8 requirement)
npm run dev          # dev server, http://localhost:5173
npm run build        # tsc -b (typecheck) then vite build -> dist/
npm test             # Vitest watch;  npx vitest run  for a single pass
npm run lint         # oxlint
npm run preview      # serve the built dist/
```

`npm run build` fails on any type error — it is the typecheck gate. Run
`npx vitest run && npx oxlint && npm run build` before declaring work done.

## Core Logic Summary

Weights are **relative**, not percentages. Each subtask's duration is

```
durationMs = round(goalTotalMs × weight / Σ weights)
```

computed in **integer milliseconds** using the largest-remainder method, then
laid out sequentially: subtask _n_ starts where _n−1_ ended. Two invariants
follow and are both tested:

1. The slices sum to **exactly** the goal's total duration — no gap, no overhang.
2. No slice is more than 1 ms from its ideal share.

The percentage shown on each card is `durationMs / totalMs`, so displayed
shares always total 100% even though raw weights are arbitrary numbers.

Full algorithm, worked example and edge cases: **[scheduling.md](.claude/docs/scheduling.md)**.

## Key Constraints

Do not change these without an explicit instruction saying so.

1. **The schedule is derived, never stored.** `buildTimeline(goal)` is pure and
   runs during render. Never add `startISO`/`endISO`/`durationMs` fields to
   `Subtask`, and never cache its output in the store.
2. **Allocation stays in integer milliseconds.** Do not reintroduce rounding to
   decimal days or hours — it breaks invariant 1 above. See the open question in
   [scheduling.md](.claude/docs/scheduling.md#spec-discrepancy).
3. **Weights are unconstrained positive numbers.** Do not add validation that
   they sum to 100, and do not treat them as percentages.
4. **`buildTimeline` must never throw.** Zero subtasks and all-zero weights are
   valid states the UI explains; throwing would crash a render.
5. **The route owns which goal is selected.** Never reintroduce an
   `activeGoalId` into the store or persisted state, and never add an action
   that mutates "the current goal". Every action takes an explicit `goalId`.
6. **`datetime-local` values are local wall-clock time.** Never build an instant
   by appending `Z` to one. Use `fromDateTimeInputValue` /
   `toDateTimeInputValue` from `src/lib/datetime.ts`.
7. **Persisted state is untrusted.** It is rebuilt field-by-field on load. When
   changing the stored shape, bump `STORAGE_VERSION` in `src/lib/storage.ts`
   and extend `deserialiseState` to read the old one.
8. **Every `localStorage` access stays guarded.** It throws on quota and is
   absent in private mode; the app must keep working in memory.
9. **Only `http`/`https` URLs are stored.** Run user input through
   `normaliseUrl` — these strings become `href`s.
10. **Tailwind 4 is CSS-first.** There is no `tailwind.config.js`; the theme
    lives in `@theme` in `src/index.css`. Use semantic tokens (`bg-surface`,
    `text-muted`), never raw colours or `dark:` variants.
11. **No `any`, no non-null assertions in app code.** TypeScript is strict with
    `noUnusedLocals`/`noUnusedParameters`; the build enforces it.
12. **`src/lib/**` stays pure** — no React, no DOM, no store imports. Tests run
    in a Node environment and depend on it.
13.. **Branch Management**: Before adding any features or fix bugs, always work on a new git branch. Never commit directly on main. Bug branches must follow naming convention bug/[des], feature branches follow naming convention feature/[des]

Assume nothing about the user's timezone or locale: dates are formatted with
`Intl` using the runtime default, and tests must stay timezone-independent.

## Additional Documentation

| File | Read it before |
| ---- | -------------- |
| [.claude/docs/architecture.md](.claude/docs/architecture.md) | Adding a route, a page, or a new layer; understanding data flow and the file map. |
| [.claude/docs/state_management.md](.claude/docs/state_management.md) | Touching the data model, store actions, selectors, or persistence. |
| [.claude/docs/scheduling.md](.claude/docs/scheduling.md) | Any change to weights, durations, ordering, or the allocation maths. |
| [.claude/docs/date_logic.md](.claude/docs/date_logic.md) | Anything involving dates, times, formatting, granularity, or DST. |
| [.claude/docs/ui_conventions.md](.claude/docs/ui_conventions.md) | Writing or restyling a component; theming, dialogs, drag-and-drop, a11y. |
| [.claude/docs/testing.md](.claude/docs/testing.md) | Adding or changing tests. |
