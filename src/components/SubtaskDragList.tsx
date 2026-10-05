import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useGoalStore } from '@/stores/goalStore';
import type { Schedule } from '@/types';
import SortableSubtaskItem from '@/components/SortableSubtaskItem';

interface SubtaskDragListProps {
  schedule: Schedule | null;
}

export default function SubtaskDragList({ schedule }: SubtaskDragListProps) {
  const { goal, reorderSubtasks } = useGoalStore();
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (goal?.subtasks) {
      setItems(goal.subtasks.map((st: any) => st.id));
    }
  }, [goal?.subtasks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      reorderSubtasks(newItems);
    }
  };

  if (!goal || !schedule) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 mb-6">
          {items.map((subtaskId: string) => {
            const subtask = goal.subtasks.find((st: any) => st.id === subtaskId);
            const scheduled = schedule.scheduledSubtasks.find((s: any) => s.subtaskId === subtaskId);

            if (!subtask || !scheduled) return null;

            return (
              <SortableSubtaskItem
                key={subtaskId}
                id={subtaskId}
                subtask={subtask}
                scheduled={scheduled}
                totalDurationMs={schedule.totalDurationMs}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
