import { useEffect, useId, useRef, useState } from 'react';
import type { Subtask } from '@/types';
import { describeUrlHost, normaliseUrl } from '@/lib/url';
import { useGoalStore } from '@/store/useGoalStore';
import { ExternalIcon, LinkIcon, NoteIcon, PlusIcon, TrashIcon } from './icons';

/** Grows a textarea to fit its content so notes never sit in a tiny scroller. */
function useAutoSize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, 88)}px`;
  }, [value]);

  return ref;
}

function LinkRow({ subtaskId, link }: { subtaskId: string; link: Subtask['links'][number] }) {
  const removeLink = useGoalStore((state) => state.removeLink);

  return (
    <li className="bg-surface border-line group flex items-center gap-2.5 rounded-xl border px-3 py-2">
      <span className="text-subtle shrink-0">
        <LinkIcon size={15} />
      </span>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
        title={link.url}
      >
        {link.label}
        <span className="text-subtle ml-2 text-xs font-normal">{describeUrlHost(link.url)}</span>
      </a>
      <span className="text-subtle shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <ExternalIcon size={13} />
      </span>
      <button
        type="button"
        onClick={() => removeLink(subtaskId, link.id)}
        className="gs-icon-btn gs-icon-btn-danger h-7 w-7"
        aria-label={`Remove link ${link.label}`}
      >
        <TrashIcon size={14} />
      </button>
    </li>
  );
}

function AddLinkForm({ subtaskId }: { subtaskId: string }) {
  const addLink = useGoalStore((state) => state.addLink);
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="gs-btn gs-btn-secondary w-full py-2 text-xs"
      >
        <PlusIcon size={14} />
        Add link
      </button>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalised = normaliseUrl(url);
    if (!normalised) {
      setError('Enter a web address, like figma.com/file/abc.');
      return;
    }

    addLink(subtaskId, { label: label.trim() || describeUrlHost(normalised), url: normalised });
    setLabel('');
    setUrl('');
    setError(null);
    setOpen(false);
  };

  return (
    <form onSubmit={submit} className="bg-surface border-line rounded-xl border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="sr-only" htmlFor={`${fieldId}-label`}>
            Link label
          </label>
          <input
            id={`${fieldId}-label`}
            className="gs-input py-2 text-sm"
            placeholder="Label (optional)"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`${fieldId}-url`}>
            Link address
          </label>
          <input
            id={`${fieldId}-url`}
            className="gs-input py-2 text-sm"
            placeholder="https://…"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            autoFocus
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <button type="submit" className="gs-btn gs-btn-primary px-3 py-1.5 text-xs">
          Save link
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="gs-btn gs-btn-ghost px-3 py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SubtaskDetails({ subtask }: { subtask: Subtask }) {
  const updateSubtask = useGoalStore((state) => state.updateSubtask);
  const titleId = useId();
  const notesId = useId();
  const notesRef = useAutoSize(subtask.notes);

  return (
    <div className="border-line bg-inset/60 grid gap-5 border-t px-4 py-4 sm:px-5">
      <section>
        <label
          htmlFor={titleId}
          className="text-muted mb-2.5 block text-xs font-semibold tracking-wide uppercase"
        >
          Title
        </label>
        <input
          id={titleId}
          value={subtask.title}
          onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })}
          placeholder="What is this step?"
          className="gs-input font-medium"
        />
      </section>

      <section>
        <h4 className="text-muted mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <LinkIcon size={13} />
          Links
          {subtask.links.length > 0 && (
            <span className="text-subtle normal-case">({subtask.links.length})</span>
          )}
        </h4>

        {subtask.links.length > 0 && (
          <ul className="mb-2 grid gap-2">
            {subtask.links.map((link) => (
              <LinkRow key={link.id} subtaskId={subtask.id} link={link} />
            ))}
          </ul>
        )}

        <AddLinkForm subtaskId={subtask.id} />
      </section>

      <section>
        <label
          htmlFor={notesId}
          className="text-muted mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase"
        >
          <NoteIcon size={13} />
          Notes
        </label>
        <textarea
          id={notesId}
          ref={notesRef}
          value={subtask.notes}
          onChange={(event) => updateSubtask(subtask.id, { notes: event.target.value })}
          placeholder="What does done look like? Anything you need to remember…"
          className="gs-input min-h-[88px] leading-relaxed"
        />
        <p className="text-subtle mt-1.5 text-xs">Saves as you type.</p>
      </section>
    </div>
  );
}
