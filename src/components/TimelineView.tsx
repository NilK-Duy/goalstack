import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Goal } from '@/types';
import type { Timeline } from '@/lib/schedule';
import { useGoalStore } from '@/store/useGoalStore';
import { SubtaskComposer } from './SubtaskComposer';
import { TimelineCard } from './TimelineCard';
import { GripIcon, WarningIcon } from './icons';

interface TimelineViewProps {
  goal: Goal;
  timeline: Timeline;
}

function EmptyState() {
  return (
    <div className="border-line text-center rounded-2xl border border-dashed px-6 py-10">
      <p className="text-sm font-semibold">No subtasks yet</p>
      <p className="text-muted mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">
        Add the steps below. Weights are relative — a step with weight 3 gets three times the time of
        one with weight 1, and GoalStack divides the goal's duration between them in order.
      </p>
    </div>
  );
}

export function TimelineView({ goal, timeline }: TimelineViewProps) {
  const reorderSubtasks = useGoalStore((state) => state.reorderSubtasks);

  const sensors = useSensors(
    // A small threshold so a click on the handle still reads as a click and
    // doesn't start a drag the user didn't intend.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = goal.subtasks.map((subtask) => subtask.id);
  const unscheduled = timeline.totalWeight <= 0;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    // The store holds the order; no local mirror to drift out of sync.
    reorderSubtasks(arrayMove(ids, from, to));
  };

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold tracking-tight">Timeline</h2>
        {goal.subtasks.length > 1 && (
          <p className="text-subtle flex items-center gap-1.5 text-xs">
            <GripIcon size={13} />
            Drag to reorder
          </p>
        )}
      </div>

      {unscheduled && goal.subtasks.length > 0 && (
        <p
          role="status"
          className="border-line bg-inset text-muted mb-3 flex items-start gap-2.5 rounded-xl border
            px-3.5 py-3 text-sm"
        >
          <span className="text-danger mt-0.5 shrink-0">
            <WarningIcon size={15} />
          </span>
          Every subtask has a weight of zero, so there is nothing to divide the time between. Give at
          least one subtask a weight above zero.
        </p>
      )}

      {goal.subtasks.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {/* The rail sits behind the cards; each card draws its own node. */}
            <div className="relative">
              <span
                aria-hidden="true"
                className="from-accent/45 via-line to-line absolute top-3 bottom-3 left-[17px]
                  w-px bg-gradient-to-b sm:left-6"
              />
              <ol className="relative grid gap-3">
                {timeline.items.map((item) => (
                  <TimelineCard
                    key={item.subtask.id}
                    item={item}
                    granularity={timeline.granularity}
                    unscheduled={unscheduled}
                  />
                ))}
              </ol>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3">
        <SubtaskComposer />
      </div>
    </section>
  );
}
