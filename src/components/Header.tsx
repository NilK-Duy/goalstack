import { useGoalStore } from '@/stores/goalStore';

export default function Header() {
  const { goal, clearGoal } = useGoalStore();

  return (
    <header className="header bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">GoalStack</h1>
        {goal && (
          <button
            onClick={clearGoal}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Clear Goal
          </button>
        )}
      </div>
    </header>
  );
}
