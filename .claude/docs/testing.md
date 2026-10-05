# Testing

## Commands

```bash
npm test             # Vitest, watch mode
npx vitest run       # single pass — use this in scripted checks
npx vitest run src/lib/schedule.test.ts
npx oxlint
npm run build        # tsc -b is the typecheck gate
```

Definition of done for a change: `npx vitest run && npx oxlint && npm run build`
all clean.

## Setup

Vitest config lives in `vite.config.ts` — there is no separate
`vitest.config.ts`, deliberately, so the `@` alias cannot drift between the app
and its tests.

```ts
test: { environment: 'node', include: ['src/**/*.test.ts'] }
```

`environment: 'node'` because everything under test is pure logic. There is no
jsdom and no `@testing-library/react` installed.

Consequences:

- `include` only matches `.test.ts`, **not `.test.tsx`**. Adding a component
  test means installing jsdom + testing-library, switching the environment, and
  widening `include`.
- Globals are off. Import `describe`/`it`/`expect`/`vi` from `vitest` explicitly.
- `src/lib/**` must stay free of React and DOM for these to run at all.

## Coverage map

| File | Covers |
| ---- | ------ |
| `src/lib/schedule.test.ts` | Unit conversion, `allocate` (exact sums, proportionality, largest-remainder tie-breaks, zero/negative/`NaN` weights), `buildTimeline` contiguity and invariants, granularity resolution |
| `src/lib/format.test.ts` | Duration strings, inclusive end dates, same-day range collapsing, share rounding, pluralisation |
| `src/lib/datetime.test.ts` | `datetime-local` round trip, local-not-UTC parsing, rejection of impossible dates |
| `src/lib/url.test.ts` | Protocol allowlist (`javascript:`, `data:`, `file:` rejected), bare-host prefixing, host display |
| `src/lib/storage.test.ts` | v1→v3 migration, field-level repair of malformed JSON, memory repository |
| `src/store/useGoalStore.test.ts` | Goal scoping, unknown-id no-ops, subtask CRUD, reordering, links, `updatedAt` stamping, debounced persistence |

**Not covered:** every component, routing, dnd-kit interaction, the `<dialog>`
focus behaviour, and the theme bootstrap. Those need a browser or jsdom and
have only been verified by hand.

## Conventions

### Timezone safety

Tests run in whatever zone CI uses. Two rules:

1. **Build dates from local components**, never ISO strings:
   `new Date(2026, 0, 14)` — local midnight, portable.
   `new Date('2026-01-14T00:00:00Z')` is local midnight only in UTC.
2. **Compare against locally built `Intl` output**, not hardcoded strings. The
   `dayOf()` helper in `format.test.ts` is the pattern: it verifies the logic
   layered over the formatter without asserting anything about locale.

Day-granularity fixtures use **mid-January**, which has no daylight-saving
transition in any common zone. A date in early October or April can land on a
transition in some zone and make whole-day boundaries miss midnight, which
legitimately flips granularity to `'minute'` and fails the test for the right
reason in the wrong place.

### Fake timers

`useGoalStore.test.ts` runs on `vi.useFakeTimers()` with a fixed system time.
Needed for two things:

- Deterministic `createdAt`/`updatedAt` — `vi.setSystemTime` to advance, since
  two real calls can land in the same millisecond.
- The 200 ms persistence debounce — `vi.advanceTimersByTime(250)` before
  asserting the repository was written.

Always `vi.useRealTimers()` in `afterEach`.

### Store tests

Build a store per test over a memory repository; never import the app singleton:

```ts
const store = createGoalStore(createMemoryRepository());
store.getState().createGoal({ … });
```

`createMemoryRepository` can be seeded to test hydration, and spied with
`vi.spyOn(repository, 'save')` to test write-through.

## What a change should add

| Change | Test to add |
| ------ | ----------- |
| New `lib/` function | A `.test.ts` beside it. Non-negotiable — this layer is the reason the app is trustworthy. |
| New store action | A case in `useGoalStore.test.ts` proving it edits the named goal **and leaves a second goal untouched**. |
| Change to allocation | Re-assert the four invariants in [scheduling.md](scheduling.md#invariants). |
| New persisted field | A `storage.test.ts` case proving it survives a round trip and that a missing value is repaired. |
| Bug fix | A test that fails before the fix. |
