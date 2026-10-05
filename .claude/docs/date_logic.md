# Date and time logic

Two modules: `src/lib/datetime.ts` (input ↔ instant) and `src/lib/format.ts`
(instant → display). Tests: `datetime.test.ts`, `format.test.ts`.

## Storage and display contract

- **Stored**: `Goal.startISO`, an ISO-8601 **UTC instant**.
- **Computed**: milliseconds since epoch, throughout `schedule.ts`.
- **Displayed**: the viewer's local timezone and locale, via `Intl`.

Never store a wall-clock string, and never format a date by hand.

## `datetime-local` conversion

The `<input type="datetime-local">` value is **local wall-clock time with no
zone suffix** (`2026-10-05T14:00`).

```ts
toDateTimeInputValue(ms): string   // instant → "YYYY-MM-DDTHH:mm" local
fromDateTimeInputValue(v): number | null
defaultGoalStart(): number         // today at 09:00 local
```

`fromDateTimeInputValue` builds the instant from explicit components
(`new Date(y, m-1, d, h, min)`), not `new Date(value)`. It also rejects dates
the `Date` constructor would silently roll over — `2026-02-31` becomes March 3rd
otherwise — and returns `null` rather than `NaN` so callers must handle it.

> **Regression guard.** An earlier version built the instant as
> `` new Date(`${date}T${time}:00Z`) ``. Appending `Z` declares local input to be
> UTC and shifted every goal by the viewer's offset. Always use these helpers.

## Granularity

`buildTimeline` resolves `granularity: 'day' | 'minute'` once per timeline, and
every formatter takes it so one goal never mixes the two.

`'day'` is used only when **all** of these hold:

1. `duration.unit === 'days'`
2. The goal start is exactly local midnight
3. Every slice is a whole multiple of 24 h **and** every slice boundary lands on
   local midnight

Otherwise `'minute'`.

Condition 3 is two checks on purpose. Adding 24 h across a daylight-saving
change moves wall-clock time by an hour, so a "whole day" slice can end at 23:00
or 01:00 local. Rather than round that to a date that is off by one, the
timeline drops to showing times — accurate instead of tidy.

This is also why scheduling is fixed-millisecond rather than calendar-based: a
"day" is always 24 h. Changing that to calendar days is a product decision, not
a formatting fix.

## Inclusive end dates

At day granularity the closing boundary is rendered **inclusively** — five days
from the 5th reads `Oct 5 – Oct 9`, not `Oct 5 – Oct 10`, because the work
occupies the 5th through the 9th. Internally intervals stay half-open
`[start, end)`; only display subtracts 1 ms.

At minute granularity the exclusive end is correct and shown as-is: work ending
at 13:30 reads `13:30`.

`formatEnd(endMs, granularity)` encapsulates this. Use it for any closing
boundary — `GoalOverview`'s "Ends" stat and `GoalListCard`'s range both do.

## Formatters

| Function | Output |
| -------- | ------ |
| `formatInstant(ms, g)` | `'day'` → `Mon, Oct 5`; `'minute'` → `Oct 5, 9:00 AM` |
| `formatEnd(ms, g)` | As above, inclusive at day granularity |
| `formatRange(start, end, g)` | Day: `Oct 5 – Oct 9`, collapsing to `Oct 5` for a single day. Minute: `Oct 5, 9:00 AM – 1:30 PM` within one day, otherwise both dates |
| `formatDuration(ms)` | `5d`, `2d 6h`, `3h 30m`, `45m`, `<1m`, `0m` — at most the two largest non-zero units |
| `formatShare(share)` | `50%`, `6.4%` below 10%, `<1%` below 1% |
| `formatGoalDuration(value, unit)` | `1 day`, `14 days`, `2.5 hours` — pluralised |

The year is appended automatically when a date is not in the current year.

## Rules

1. Use the helpers. No `toLocaleDateString` calls in components.
2. Pass `granularity` down; never assume `'day'`. A hardcoded `'days'` in a
   formatter call was a real bug — hours-mode goals showed day-only ranges.
3. Any new formatter takes `granularity` if it renders a boundary.
4. Never assume the viewer's timezone or locale. Tests must stay
   timezone-independent — see [testing.md](testing.md#timezone-safety).
