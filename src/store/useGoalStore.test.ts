import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepository, type GoalRepository } from '@/lib/storage';
import { createGoalStore } from './useGoalStore';

const START = new Date(2026, 0, 14).toISOString();

function setup(repository: GoalRepository = createMemoryRepository()) {
  const store = createGoalStore(repository);

  const newGoal = (title: string) =>
    store.getState().createGoal({ title, startISO: START, duration: { value: 10, unit: 'days' } });

  return { store, newGoal, repository };
}

const goalById = (store: ReturnType<typeof setup>['store'], id: string) =>
  store.getState().goals.find((goal) => goal.id === id)!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 14, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createGoal', () => {
  it('appends the goal and returns its id', () => {
    const { store, newGoal } = setup();

    const first = newGoal('First');
    const second = newGoal('Second');

    expect(store.getState().goals.map((goal) => goal.id)).toEqual([first, second]);
    expect(first).not.toBe(second);
    expect(goalById(store, first).title).toBe('First');
  });

  it('trims the title and seeds subtasks when given them', () => {
    const { store } = setup();

    const id = store.getState().createGoal(
      { title: '  Spaced  ', startISO: START, duration: { value: 3, unit: 'hours' } },
      [{ title: ' Research ', weight: 2 }, { title: 'Build', weight: 5 }],
    );

    const goal = goalById(store, id);
    expect(goal.title).toBe('Spaced');
    expect(goal.subtasks.map((subtask) => subtask.title)).toEqual(['Research', 'Build']);
    expect(goal.subtasks.map((subtask) => subtask.weight)).toEqual([2, 5]);
    expect(goal.subtasks[0].links).toEqual([]);
    expect(goal.subtasks[0].notes).toBe('');
  });
});

describe('goal scoping', () => {
  it('edits only the goal it names', () => {
    const { store, newGoal } = setup();
    const target = newGoal('Target');
    const other = newGoal('Other');

    store.getState().updateGoal(target, { title: 'Renamed' });

    expect(goalById(store, target).title).toBe('Renamed');
    expect(goalById(store, other).title).toBe('Other');
  });

  it('adds subtasks only to the goal it names', () => {
    const { store, newGoal } = setup();
    const target = newGoal('Target');
    const other = newGoal('Other');

    store.getState().addSubtask(target, { title: 'Step', weight: 1 });

    expect(goalById(store, target).subtasks).toHaveLength(1);
    expect(goalById(store, other).subtasks).toHaveLength(0);
  });

  it('ignores mutations aimed at a goal that no longer exists', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Only');
    const before = store.getState().goals;

    // A stale route or a second tab can both address a deleted goal.
    store.getState().updateGoal('goal_gone', { title: 'Nope' });
    store.getState().addSubtask('goal_gone', { title: 'Nope', weight: 1 });
    store.getState().removeSubtask('goal_gone', 'subtask_gone');
    store.getState().reorderSubtasks('goal_gone', []);

    expect(store.getState().goals).toBe(before);
    expect(goalById(store, id).title).toBe('Only');
  });

  it('ignores a subtask id that is not in the named goal', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    store.getState().addSubtask(id, { title: 'Step', weight: 1 });

    store.getState().updateSubtask(id, 'subtask_gone', { title: 'Nope' });

    expect(goalById(store, id).subtasks.map((subtask) => subtask.title)).toEqual(['Step']);
  });
});

describe('subtasks', () => {
  it('updates, removes and keeps the rest intact', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    const add = (title: string) => store.getState().addSubtask(id, { title, weight: 1 });
    add('A');
    add('B');
    add('C');

    const [a, b, c] = goalById(store, id).subtasks.map((subtask) => subtask.id);

    store.getState().updateSubtask(id, b, { weight: 9, notes: 'hello' });
    store.getState().removeSubtask(id, a);

    const subtasks = goalById(store, id).subtasks;
    expect(subtasks.map((subtask) => subtask.id)).toEqual([b, c]);
    expect(subtasks[0].weight).toBe(9);
    expect(subtasks[0].notes).toBe('hello');
    expect(subtasks[0].title).toBe('B');
  });

  it('reorders to the given sequence', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    ['A', 'B', 'C'].forEach((title) => store.getState().addSubtask(id, { title, weight: 1 }));

    const [a, b, c] = goalById(store, id).subtasks.map((subtask) => subtask.id);
    store.getState().reorderSubtasks(id, [c, a, b]);

    expect(goalById(store, id).subtasks.map((subtask) => subtask.id)).toEqual([c, a, b]);
  });

  it('keeps subtasks the reorder list did not mention', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    ['A', 'B', 'C'].forEach((title) => store.getState().addSubtask(id, { title, weight: 1 }));

    const [a, b, c] = goalById(store, id).subtasks.map((subtask) => subtask.id);
    store.getState().reorderSubtasks(id, [c, a]);

    // `b` is appended rather than dropped: a partial list is a caller bug, and
    // silently deleting the user's work would be the worse failure.
    expect(goalById(store, id).subtasks.map((subtask) => subtask.id)).toEqual([c, a, b]);
  });
});

describe('links', () => {
  it('adds and removes links on the right subtask', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    store.getState().addSubtask(id, { title: 'Step', weight: 1 });
    const subtaskId = goalById(store, id).subtasks[0].id;

    store.getState().addLink(id, subtaskId, { label: 'Spec', url: 'https://example.com/spec' });
    store.getState().addLink(id, subtaskId, { label: '', url: 'https://example.com/bare' });

    const links = goalById(store, id).subtasks[0].links;
    expect(links.map((link) => link.label)).toEqual(['Spec', 'https://example.com/bare']);

    store.getState().removeLink(id, subtaskId, links[0].id);
    expect(goalById(store, id).subtasks[0].links.map((link) => link.label)).toEqual([
      'https://example.com/bare',
    ]);
  });
});

describe('deleteGoal', () => {
  it('removes only the named goal', () => {
    const { store, newGoal } = setup();
    const keep = newGoal('Keep');
    const drop = newGoal('Drop');

    store.getState().deleteGoal(drop);

    expect(store.getState().goals.map((goal) => goal.id)).toEqual([keep]);
  });
});

describe('updatedAt', () => {
  it('advances on every edit so the list can order by recency', () => {
    const { store, newGoal } = setup();
    const id = newGoal('Goal');
    const created = goalById(store, id).updatedAt;

    vi.setSystemTime(new Date(2026, 0, 14, 12, 5, 0));
    store.getState().addSubtask(id, { title: 'Step', weight: 1 });

    expect(goalById(store, id).updatedAt > created).toBe(true);
    expect(goalById(store, id).createdAt).toBe(created);
  });
});

describe('persistence', () => {
  it('writes through to the repository once the debounce settles', () => {
    const repository = createMemoryRepository();
    const save = vi.spyOn(repository, 'save');
    const { store, newGoal } = setup(repository);

    const id = newGoal('Goal');
    store.getState().updateSubtask(id, 'noop', {});
    store.getState().addSubtask(id, { title: 'Step', weight: 2 });

    // Still coalescing: nothing has reached storage yet.
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(save).toHaveBeenCalledTimes(1);
    expect(repository.load().goals[0].subtasks).toHaveLength(1);
  });

  it('starts from whatever the repository already holds', () => {
    const seeded = createMemoryRepository();
    const first = setup(seeded);
    first.newGoal('Saved earlier');
    vi.advanceTimersByTime(250);

    const { store } = setup(seeded);

    expect(store.getState().goals.map((goal) => goal.title)).toEqual(['Saved earlier']);
  });
});
