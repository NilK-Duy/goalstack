import { useState } from 'react';
import type { Subtask, ScheduledSubtask } from '@/types';
import { formatDateRange, getSubtaskPercentage } from '@/lib/schedule';
import SubtaskExpanded from '@/components/SubtaskExpanded';

interface SubtaskCardProps {
  subtask: Subtask;
  scheduled: ScheduledSubtask;
  totalDurationMs: number;
}

export default function SubtaskCard({ subtask, scheduled, totalDurationMs }: SubtaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = getSubtaskPercentage(scheduled.durationMs, totalDurationMs);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex justify-between items-center"
      >
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">{subtask.title}</h4>
          <p className="text-sm text-gray-600">
            {formatDateRange(scheduled.startISO, scheduled.endISO, 'days')} • {percentage.toFixed(1)}%
          </p>
        </div>
        <div className="text-2xl text-gray-400 ml-4">{isExpanded ? '−' : '+'}</div>
      </button>

      {isExpanded && <SubtaskExpanded subtask={subtask} />}
    </div>
  );
}
