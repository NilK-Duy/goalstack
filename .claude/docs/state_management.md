# State management

## Data model

`src/types.ts` is the whole model. Nothing else defines persisted shape.

```ts
type DurationUnit = 'days' | 'hours';

interface Link {
  id: string;        // "link_…"
  label: string;     // falls back to the URL when the user leaves it blank
  url: string;       // always http/https, normalised before it gets here
}

interface Subtask {
  id: string;        // "subtask_…"
  title: string;
  weight: number;    // relative, >= 0. NOT a percentage.
  links: Link[];
  notes: string;     // plain text, never markdown-rendered
}

interface Duration {
  value: number;     // > 0
  unit: DurationUnit;
}

interface Goal {
  id: string;        // "goal_…"
  startISO: string;  // ISO-8601 UTC instant
  title: string;
  duration: Duration;
  subtasks: Subtask[];   // order is meaningful — it is the schedule order
  createdAt: string;
  updatedAt: string;     // drives list ordering; stamped by every mutation
}
```

Deliberately absent: any start/end/duration on `Subtask`. Those are derived per
render by `buildTimeline` — see [scheduling.md](scheduling.md).

`subtasks` array order **is** the schedule. Reordering reschedules everything
after the moved item; there is no separate sort key.

## Store shape

```ts
interface GoalState { goals: Goal[] }   // that is all that persists
```

There is no `activeGoalId`. The route owns selection
([architecture.md](architecture.md#routing)); storing it too would be a second
source of truth that disagrees after a back/forward navigation.

## Actions

Every action names its goal. Signatures from `src/store/useGoalStore.ts`:

| Action | Notes |
| ------ | ----- |
| `createGoal(input, seedSubtasks?)` | **Returns the new goal's id** so the caller can navigate to it. Trims the title. |
| `updateGoal(goalId, patch)` | `patch` covers `title`/`startISO`/`duration` only. Trims title if present. |
| `deleteGoal(goalId)` | |
| `addSubtask(goalId, { title, weight })` | Appends. Trims title. |
| `updateSubtask(goalId, subtaskId, patch)` | `patch` covers `title`/`weight`/`notes`. Title is *not* trimmed — the user may be mid-word. |
| `removeSubtask(goalId, subtaskId)` | Takes its links and notes with it. No confirm step today. |
| `reorderSubtasks(goalId, orderedIds)` | Ids not in the list are appended, not dropped. |
| `addLink(goalId, subtaskId, { label, url })` | Label falls back to the URL. Expects an already-normalised URL. |
| `removeLink(goalId, subtaskId, linkId)` | |

Two internal helpers every mutation goes through:

- `mutateGoal(goalId, recipe)` — resolves the goal, applies `recipe`, stamps
  `updatedAt`, calls `set`, queues a save. **An unknown `goalId` is a silent
  no-op**: a stale route or a second tab can legitimately address a goal that
  is already gone, and that is not an error condition.
- `mutateSubtask(goalId, subtaskId, recipe)` — same, scoped one level deeper.
  An unknown `subtaskId` leaves the goal untouched.

### Adding an action

1. Add the signature to the `GoalActions` interface — `goalId` first.
2. Implement it via `mutateGoal` or `mutateSubtask`. Do not call `set` directly
   unless you are adding or removing a whole goal (`createGoal`, `deleteGoal`),
   which are the only two that legitimately bypass them.
3. Add a test in `src/store/useGoalStore.test.ts`, including a case proving it
   does not touch a second goal.

## Selectors

```ts
const goals = useGoalStore((s) => s.goals);          // stable reference
const addSubtask = useGoalStore((s) => s.addSubtask); // stable reference
const goal = useGoal(goalId);                         // the goal object, or null
```

**Zustand 5 pitfall:** a selector that builds a new object or array on every
call re-renders on every store write and can trip React's
`getSnapshot should be cached` warning. Select stable references and derive in
the component:

```ts
// WRONG — new array each call
const ordered = useGoalStore((s) => [...s.goals].sort(…));

// RIGHT — sort in a memo over the stable reference
const goals = useGoalStore((s) => s.goals);
const ordered = useMemo(() => [...goals].sort(…), [goals]);
```

`GoalsListPage` does exactly this. `useGoal` is safe because `find` returns the
existing goal object, not a new one.

## Persistence

### The repository seam

```ts
interface GoalRepository {
  load(): GoalState;
  save(state: GoalState): void;
}
```

`createLocalStorageRepository()` is the production one;
`createMemoryRepository(initial?)` is for tests. Swapping in an API client is a
third implementation and no change above this line.

`createGoalStore(repository)` is exported for that reason — the app's singleton
is `useGoalStore = createGoalStore(createLocalStorageRepository())`, and tests
build their own over memory.

### Debounced writes

Notes are typed a character at a time and weights are clicked through a range;
each of those is a full serialise-and-write. `createDebouncedWriter` coalesces
them on a 200 ms trailing timer and flushes on `pagehide` and on
`visibilitychange → hidden`, so a closing tab does not lose the last keystroke.

Consequence for tests: assert on `store.getState()` for logic, and advance fake
timers past 200 ms before asserting the repository was written.

### Guarding

Every `localStorage` call is wrapped. It throws on quota overflow, and the whole
API is absent or throwing in private mode and SSR. The repository probes once at
construction and falls back to a null store, so the app runs in memory for the
session rather than failing to boot.

### Versioning and migration

`STORAGE_VERSION` is **3**, under key `goalstack:state`. `deserialiseState`
reads every past shape:

| Version | Shape | Handling |
| ------- | ----- | -------- |
| 1 | `{ version, goal }` | Single goal lifted into `goals`. |
| 2 | `{ version, goals, activeGoalId }` | `activeGoalId` read and discarded. |
| 3 | `{ version, goals }` | Current. |

**Changing the persisted shape requires** bumping `STORAGE_VERSION`, extending
`deserialiseState`, and adding a test to `src/lib/storage.test.ts`.

### Stored state is untrusted

`normaliseGoal`/`normaliseSubtask`/`normaliseLink` rebuild every object field by
field. Stored JSON can be hand-edited, left over from an older build, or
truncated, and a malformed field should cost that field and nothing more:

- Missing title → `"Untitled goal"` / `"Untitled subtask"`.
- Non-numeric weight → `1`; negative → clamped to `0`.
- Unparseable `startISO` → now.
- Missing id → a fresh one.
- Link with no `url` → dropped entirely.

A new field on `Goal` or `Subtask` **must** get a branch here, or it will be
silently stripped on the next load.
