# Scheduling

Everything here lives in `src/lib/schedule.ts`, is pure, and is covered by
`src/lib/schedule.test.ts`.

## Model

A goal owns a start instant and a total duration. Its subtasks own **relative
weights**. Scheduling converts those into a contiguous, sequential set of
intervals that exactly fills the goal.

- `days` means 24-hour days, `hours` means clock hours. Both are measured in
  milliseconds from the start instant.
- "Sequential" means subtask _n_ starts exactly where _n−1_ ended. Nothing
  overlaps and nothing idles. There is no parallelism and no concept of
  working days or weekends.
- List order **is** schedule order. Reorder the array and everything after the
  moved item shifts.

## `allocate(weights, totalMs) => number[]`

Largest-remainder method:

1. Coerce each weight: non-finite or `<= 0` becomes `0`.
2. `totalWeight = Σ weights`. If it is `0`, or the budget is `0`, return all zeros.
3. `ideal[i] = budget × weight[i] / totalWeight`.
4. `allocated[i] = floor(ideal[i])`.
5. Distribute the leftover `budget − Σ allocated` one millisecond at a time to
   the slices with the largest truncated fraction, ties broken by index.

Each floor discards less than 1 ms, so the remainder is always smaller than the
number of slices and step 5 needs a single pass.

### Why not floor-and-dump

Flooring every slice and giving the accumulated remainder to the last subtask
also sums correctly, but concentrates all the error in one place — with many
subtasks the final slice visibly absorbs the drift. Largest-remainder spreads it
so no slice is ever more than 1 ms from its ideal share.

## Worked example

The bundled example plan: 21 days, weights 2 / 3 / 5 / 2 / 1 (Σ = 13).
Budget = 21 × 86,400,000 = **1,814,400,000 ms**.

| Subtask | Weight | ideal (ms) | floor | frac | +1? | final (ms) | ≈ | share |
| ------- | ------ | ---------- | ----- | ---- | --- | ---------- | - | ----- |
| Research | 2 | 279,138,461.54 | 279,138,461 | .54 | yes | 279,138,462 | 3d 5h | 15% |
| Wireframes | 3 | 418,707,692.31 | 418,707,692 | .31 | — | 418,707,692 | 4d 20h | 23% |
| Prototype | 5 | 697,846,153.85 | 697,846,153 | .85 | yes | 697,846,154 | 8d 1h | 38% |
| Testing | 2 | 279,138,461.54 | 279,138,461 | .54 | — | 279,138,461 | 3d 5h | 15% |
| Hand-off | 1 | 139,569,230.77 | 139,569,230 | .77 | yes | 139,569,231 | 1d 14h | 8% |

Floors sum to 1,814,399,997 — three milliseconds short, so the three largest
fractions (.85, .77, then .54 with the tie going to the lower index) each gain
one. Final total: **1,814,400,000 ms exactly**.

## `buildTimeline(goal) => Timeline`

```ts
interface Timeline {
  items: TimelineItem[];
  startMs: number;      // goal start
  endMs: number;        // startMs + totalMs
  totalMs: number;
  totalWeight: number;  // sum of usable weights; 0 means nothing is scheduled
  granularity: 'day' | 'minute';
}

interface TimelineItem {
  subtask: Subtask;
  position: number;     // 1-based, for display
  startMs: number;
  endMs: number;
  durationMs: number;
  share: number;        // durationMs / totalMs, 0–1
}
```

`granularity` is a display concern and is explained in
[date_logic.md](date_logic.md#granularity).

`share` is what the UI shows as a percentage. Because it is derived from
allocated duration rather than raw weight, displayed shares always total 100%.

## Invariants

All four are asserted in `schedule.test.ts`. Do not break them.

1. `Σ item.durationMs === timeline.totalMs` — exactly, for any weights.
2. `items[n].startMs === items[n-1].endMs` — contiguous, no gaps.
3. `items.at(-1).endMs === timeline.endMs` — the last slice lands on the goal's end.
4. `|item.durationMs − ideal| < 1` ms for every item.

## Edge cases

| Input | Behaviour |
| ----- | --------- |
| No subtasks | `items: []`, `totalWeight: 0`. `endMs` still reflects the goal duration. |
| All weights `0` | Every slice is zero-length and starts at the goal start. `totalWeight` is `0`; `TimelineView` shows a banner telling the user to give something a weight. |
| One weight `0` among others | That subtask keeps its position as a zero-length slice; the rest divide the full budget. A way to park a step without deleting it. |
| Negative or `NaN` weight | Treated as `0`. |
| Negative or `NaN` goal duration | `durationToMs` clamps to `0`. |
| Unparseable `startISO` | Falls back to `Date.now()`. |

**`buildTimeline` never throws.** Zero subtasks and all-zero weights are states
a half-filled form passes through, and it runs during render — throwing would
blank the page. Validation belongs in the forms, not here.

## Spec discrepancy

> The onboarding brief states: *"Allocated days = (subtask weight / sum of all
> weights) × goal total days, rounded to 1 decimal"* and *"relative effort
> weight (total up to 100%)"*.

The proportional formula matches the implementation. Two details do not:

**1. There is no rounding to one decimal.** Allocation is integer milliseconds.
One-decimal days is a 2.4-hour quantum, and it breaks invariant 1. Ten days
across three equal weights:

- Rounded to 1 dp: `3.3 + 3.3 + 3.3 = 9.9` days — **2h 24m of the goal is
  unaccounted for**, and the last subtask's end no longer matches the goal's end.
- Current code: `288,000,000 ms` each, summing to `864,000,000 ms` = 10 days exactly.

The brief is also days-only, whereas the app supports an `hours` unit where a
one-decimal-day quantum would be larger than many whole subtasks.

**2. Weights are not constrained to total 100.** They are arbitrary positive
numbers (the stepper defaults to 1 and moves in steps of 1); the *displayed
shares* total 100%. Requiring raw weights to sum to 100 would mean re-balancing
every other subtask whenever one changes.

**This is unresolved and needs a product decision.** Either:

- **Keep the code** (recommended): the brief's formula is a simplification, and
  these docs are correct. No work.
- **Follow the brief literally**: quantise to 0.1 days. Then invariant 1 must be
  relaxed or the goal's end must be redefined as the sum of its slices, and
  `hours` goals need a separate rule. This is a behaviour change with test
  changes, not a refactor.

Do not "fix" the code to match the brief without that decision being made
explicitly.
