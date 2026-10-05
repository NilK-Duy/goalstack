import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import type { Granularity, TimelineItem } from '@/lib/schedule';
import { formatDuration, formatRange, formatShare } from '@/lib/format';
import { useGoalStore } from '@/store/useGoalStore';
import { ChevronIcon, GripIcon, LinkIcon, NoteIcon, TrashIcon } from './icons';
import { SubtaskDetails } from './SubtaskDetails';

interface TimelineCardProps {
  item: TimelineItem;
  granularity: Granularity;
  /** True when no subtask carries weight, so nothing can be scheduled yet. */
  unscheduled: boolean;
}

function WeightStepper({ subtaskId, weight }: { subtaskId: string; weight: number }) {
  const updateSubtask = useGoalStore((state) => state.updateSubtask);
  const set = (next: number) => updateSubtask(subtaskId, { weight: Math.max(0, next) });

  return (
    <div className="border-line bg-surface flex items-center gap-0.5 rounded-lg border p-0.5">
      <button
        type="button"
        onClick={() => set(weight - 1)}
        disabled={weight <= 0}
        className="gs-icon-btn h-6 w-6 rounded-md disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease weight"
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        type="number"
        min="0"
        step="1"
        value={weight}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          set(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="text-fg w-9 border-0 bg-transparent text-center text-sm font-semibold tabular-nums
          focus:outline-none"
        aria-label="Weight"
      />
      <button
        type="button"
        onClick={() => set(weight + 1)}
        className="gs-icon-btn h-6 w-6 rounded-md"
        aria-label="Increase weight"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export function TimelineCard({ item, granularity, unscheduled }: TimelineCardProps) {
  const removeSubtask = useGoalStore((state) => state.removeSubtask);
  const [expanded, setExpanded] = useState(false);
  const { subtask } = item;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: subtask.id });

  // Collapse for the duration of a drag: a tall open card makes the sortable
  // collision maths feel unpredictable and the drop target hard to aim at.
  const open = expanded && !isDragging;
  const panelId = `subtask-panel-${subtask.id}`;
  const hasNotes = subtask.notes.trim().length > 0;

  return (
    <li
      ref={setNodeRef}
      // Vertical-only translation. The list is a single column, so sideways
      // movement is never meaningful, and dropping the x component keeps the
      // card on its rail without needing @dnd-kit/modifiers.
      style={{
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
        transition,
      }}
      className={`relative pl-9 sm:pl-12 ${isDragging ? 'z-10' : ''}`}
    >
      {/* Node on the rail drawn by TimelineView. */}
      <span
        aria-hidden="true"
        className={`border-canvas absolute top-5 left-[11px] h-3.5 w-3.5 rounded-full border-2 transition-colors
          sm:left-[18px] ${item.durationMs > 0 ? 'bg-accent' : 'bg-line-strong'}`}
      />

      <article
        className={`gs-card overflow-hidden transition-shadow ${isDragging ? 'shadow-float' : ''}`}
      >
        <div className="flex items-stretch">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            type="button"
            className="text-subtle hover:text-fg hover:bg-inset flex w-8 cursor-grab touch-none items-center
              justify-center transition-colors active:cursor-grabbing"
            aria-label={`Reorder ${subtask.title}`}
          >
            <GripIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className="hover:bg-inset/60 flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-3 py-3.5
              text-left transition-colors"
          >
            <span
              className="bg-inset text-muted mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center
                rounded-md text-xs font-semibold tabular-nums"
              aria-hidden="true"
            >
              {item.position}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold break-words">{subtask.title}</span>
              <span className="text-muted mt-0.5 block text-xs">
                {unscheduled ? (
                  'Not scheduled yet'
                ) : (
                  <>
                    {formatRange(item.startMs, item.endMs, granularity)}
                    <span className="text-subtle"> · </span>
                    {formatDuration(item.durationMs)}
                  </>
                )}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2">
              {!unscheduled && (
                <span className="text-muted text-xs font-semibold tabular-nums">
                  {formatShare(item.share)}
                </span>
              )}
              <span
                className={`text-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              >
                <ChevronIcon size={16} />
              </span>
            </span>
          </button>
        </div>

        {/* Share of the goal, as a bar that doubles as the rail's scale. */}
        <div className="bg-inset h-1 w-full" aria-hidden="true">
          <div
            className="bg-accent h-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, item.share * 100)}%` }}
          />
        </div>

        <div className="border-line flex items-center gap-2 border-t px-3 py-2">
          <WeightStepper subtaskId={subtask.id} weight={subtask.weight} />

          <span className="text-subtle mr-auto flex items-center gap-2.5 text-xs">
            {subtask.links.length > 0 && (
              <span className="flex items-center gap-1" title={`${subtask.links.length} link(s)`}>
                <LinkIcon size={13} />
                {subtask.links.length}
              </span>
            )}
            {hasNotes && (
              <span title="Has notes">
                <NoteIcon size={13} />
              </span>
            )}
          </span>

          <button
            type="button"
            onClick={() => removeSubtask(subtask.id)}
            className="gs-icon-btn gs-icon-btn-danger h-7 w-7"
            aria-label={`Delete ${subtask.title}`}
          >
            <TrashIcon size={14} />
          </button>
        </div>

        {/*
          Animating grid-template-rows between 0fr and 1fr gives a height
          transition without measuring the content. `inert` keeps the collapsed
          panel out of the tab order while it stays in the DOM for the animation.
        */}
        <div
          id={panelId}
          inert={!open}
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <SubtaskDetails subtask={subtask} />
          </div>
        </div>
      </article>
    </li>
  );
}
