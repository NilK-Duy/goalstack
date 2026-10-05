import { useState } from 'react';
import type { Subtask } from '@/types';
import { useGoalStore } from '@/stores/goalStore';

interface SubtaskExpandedProps {
  subtask: Subtask;
}

export default function SubtaskExpanded({ subtask }: SubtaskExpandedProps) {
  const { updateNotes, addLink, removeLink } = useGoalStore();
  const [notes, setNotes] = useState(subtask.notes);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [error, setError] = useState('');

  const handleNotesChange = (value: string) => {
    setNotes(value);
    updateNotes(subtask.id, value);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newLinkUrl.trim()) {
      setError('URL is required');
      return;
    }

    if (!newLinkLabel.trim()) {
      setError('Label is required');
      return;
    }

    try {
      new URL(newLinkUrl);
    } catch {
      setError('Invalid URL');
      return;
    }

    addLink(subtask.id, newLinkUrl, newLinkLabel);
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowLinkForm(false);
  };

  return (
    <div className="px-6 py-4 bg-gray-50 border-t">
      <div className="mb-6">
        <h5 className="font-bold mb-3">Links</h5>
        {subtask.links.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">No links yet</p>
        ) : (
          <ul className="space-y-2 mb-3">
            {subtask.links.map((link: any) => (
              <li key={link.id} className="flex justify-between items-center bg-white p-2 rounded">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex-1"
                >
                  {link.label}
                </a>
                <button
                  onClick={() => removeLink(subtask.id, link.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {showLinkForm && (
          <form onSubmit={handleAddLink} className="bg-white p-3 rounded mb-3">
            <input
              type="text"
              placeholder="Link label"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
            />
            <input
              type="url"
              placeholder="URL"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded mb-2 text-sm"
            />
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="flex-1 px-2 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!showLinkForm && (
          <button
            onClick={() => setShowLinkForm(true)}
            className="text-blue-600 hover:underline text-sm"
          >
            + Add Link
          </button>
        )}
      </div>

      <div>
        <h5 className="font-bold mb-3">Notes</h5>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes for this subtask..."
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          rows={4}
        />
      </div>
    </div>
  );
}
