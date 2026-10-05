import { describe, expect, it } from 'vitest';
import type { Goal } from '@/types';
import { createMemoryRepository, deserialiseState, emptyState } from './storage';

const goalFixture: Goal = {
  id: 'goal-1',
  title: 'Ship the redesign',
  startISO: new Date(2026, 0, 14).toISOString(),
  duration: { value: 10, unit: 'days' },
  subtasks: [
    { id: 'st-1', title: 'Research', weight: 2, links: [], notes: 'note' },
    { id: 'st-2', title: 'Build', weight: 3, links: [], notes: '' },
  ],
  createdAt: new Date(2026, 0, 1).toISOString(),
  updatedAt: new Date(2026, 0, 2).toISOString(),
};

describe('deserialiseState', () => {
  it('restores saved goals', () => {
    const state = deserialiseState(JSON.stringify({ version: 3, goals: [goalFixture] }));

    expect(state.goals).toHaveLength(1);
    expect(state.goals[0].id).toBe('goal-1');
    expect(state.goals[0].title).toBe('Ship the redesign');
    expect(state.goals[0].subtasks.map((subtask) => subtask.weight)).toEqual([2, 3]);
  });

  it('carries forward the v1 shape, which stored a single goal', () => {
    const state = deserialiseState(JSON.stringify({ version: 1, goal: goalFixture }));

    expect(state.goals).toHaveLength(1);
    expect(state.goals[0].id).toBe('goal-1');
  });

  it('ignores the v2 activeGoalId, now that the route owns selection', () => {
    const state = deserialiseState(
      JSON.stringify({ version: 2, goals: [goalFixture], activeGoalId: 'deleted-goal' }),
    );

    expect(state).toEqual({ goals: state.goals });
    expect(state.goals).toHaveLength(1);
  });

  it('repairs missing and mistyped fields instead of discarding the goal', () => {
    const state = deserialiseState(
      JSON.stringify({
        goals: [
          {
            id: 'goal-2',
            subtasks: [{ weight: 'heavy' }, { title: 'Fine', weight: -3 }],
          },
        ],
      }),
    );

    const goal = state.goals[0];
    expect(goal.title).toBe('Untitled goal');
    expect(goal.duration).toEqual({ value: 1, unit: 'days' });
    expect(Number.isNaN(new Date(goal.startISO).getTime())).toBe(false);

    // A bad weight becomes the default; a negative one is clamped to zero.
    expect(goal.subtasks[0].weight).toBe(1);
    expect(goal.subtasks[0].title).toBe('Untitled subtask');
    expect(goal.subtasks[1].weight).toBe(0);
    expect(goal.subtasks[0].id).toBeTruthy();
  });

  it('drops links with no address and labels the rest', () => {
    const state = deserialiseState(
      JSON.stringify({
        goals: [
          {
            ...goalFixture,
            subtasks: [
              {
                id: 'st-1',
                title: 'Research',
                weight: 1,
                links: [{ url: 'https://example.com' }, { label: 'orphan' }, null],
                notes: '',
              },
            ],
          },
        ],
      }),
    );

    const links = state.goals[0].subtasks[0].links;
    expect(links).toHaveLength(1);
    expect(links[0].label).toBe('https://example.com');
    expect(links[0].id).toBeTruthy();
  });

  it('returns empty state for content that is not a saved state at all', () => {
    expect(deserialiseState('null')).toEqual(emptyState);
    expect(deserialiseState('"a string"')).toEqual(emptyState);
    expect(deserialiseState('{}')).toEqual(emptyState);
    expect(deserialiseState('{"goals":"not an array"}')).toEqual(emptyState);
  });
});

describe('createMemoryRepository', () => {
  it('round-trips state through save and load', () => {
    const repository = createMemoryRepository();
    expect(repository.load()).toEqual(emptyState);

    const next = { goals: [goalFixture] };
    repository.save(next);
    expect(repository.load()).toEqual(next);
  });
});
