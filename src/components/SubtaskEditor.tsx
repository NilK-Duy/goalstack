import { useState } from 'react';
import { useGoalStore } from '@/stores/goalStore';

export default function SubtaskEditor() {
  const { addSubtask } = useGoalStore();
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('1');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Weight must be a positive number');
      return;
    }

    addSubtask(title, weightNum);
    setTitle('');
    setWeight('1');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Add Subtask
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
      <h3 className="font-bold text-lg mb-4">Add New Subtask</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="st-title" className="block text-sm font-medium mb-2">
            Subtask Title
          </label>
          <input
            id="st-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Design mockups"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="st-weight" className="block text-sm font-medium mb-2">
            Weight (importance/time allocation)
          </label>
          <input
            id="st-weight"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            min="0.5"
            step="0.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
