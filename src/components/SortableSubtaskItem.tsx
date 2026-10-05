import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Subtask, ScheduledSubtask } from '@/types';
import { formatDateRange, getSubtaskPercentage } from '@/lib/schedule';
import { useGoalStore } from '@/stores/goalStore';
import { useState } from 'react';
import SubtaskExpanded from '@/components/SubtaskExpanded';

interface SortableSubtaskItemProps {
  id: string;
  subtask: Subtask;
  scheduled: ScheduledSubtask;
  totalDurationMs: number;
}

export default function SortableSubtaskItem({
  id,
  subtask,
  scheduled,
  totalDurationMs,
}: SortableSubtaskItemProps) {
  const { deleteSubtask } = useGoalStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const percentage = getSubtaskPercentage(scheduled.durationMs, totalDurationMs);

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center">
          <div
            {...attributes}
            {...listeners}
            className="px-3 py-4 cursor-grab active:cursor-grabbing hover:bg-gray-100 flex items-center"
          >
            <span className="text-gray-400 text-xl">⋮⋮</span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-left px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <h4 className="font-bold text-lg mb-1">{subtask.title}</h4>
            <p className="text-sm text-gray-600">
              {formatDateRange(scheduled.startISO, scheduled.endISO, 'days')} • {percentage.toFixed(1)}%
            </p>
          </button>

          <button
            onClick={() => deleteSubtask(subtask.id)}
            className="px-4 py-4 text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Delete subtask"
          >
            ✕
          </button>
        </div>

        {isExpanded && <SubtaskExpanded subtask={subtask} />}
      </div>
    </div>
  );
}
