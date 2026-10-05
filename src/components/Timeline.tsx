import { useMemo } from 'react';
import { useGoalStore } from '@/stores/goalStore';
import { calculateSchedule } from '@/lib/schedule';
import SubtaskCard from '@/components/SubtaskCard';
import SubtaskEditor from '@/components/SubtaskEditor';
import SubtaskDragList from '@/components/SubtaskDragList';

export default function Timeline() {
  const { goal } = useGoalStore();

  const schedule = useMemo(() => {
    if (!goal) return null;
    return calculateSchedule(goal);
  }, [goal]);

  if (!goal) return null;

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">{goal.title}</h2>
          <p className="text-gray-600">
            {goal.duration.value} {goal.duration.unit} starting {new Date(goal.startISO).toLocaleDateString()}
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Subtasks</h3>
          {goal.subtasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No subtasks yet. Add one to get started!</p>
              <SubtaskEditor />
            </div>
          ) : (
            <>
              <SubtaskDragList schedule={schedule} />
              <div className="mt-6">
                <SubtaskEditor />
              </div>
            </>
          )}
        </div>

        {goal.subtasks.length > 0 && schedule && (
          <div className="space-y-4">
            {schedule.scheduledSubtasks.map((scheduledSt: any) => {
              const subtask = goal.subtasks.find((st: any) => st.id === scheduledSt.subtaskId);
              if (!subtask) return null;

              return (
                <SubtaskCard
                  key={scheduledSt.subtaskId}
                  subtask={subtask}
                  scheduled={scheduledSt}
                  totalDurationMs={schedule.totalDurationMs}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
