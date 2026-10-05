import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Built on the native `<dialog>`, driven by `showModal()`.
 *
 * That one call brings focus trapping, Escape to dismiss, `inert` on the rest
 * of the page, and top-layer stacking that ignores any `z-index` or
 * `overflow: hidden` an ancestor imposes. A hand-rolled overlay would be a
 * focus-management bug waiting to happen for no gain.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Calling showModal on an open dialog throws, as does close on a shut one.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Fires for Escape and for programmatic close alike, so React state
      // tracks the dialog however it was dismissed.
      onClose={onClose}
      // The dialog element is only the backdrop area; the panel below is a
      // child, so a click landing on the element itself is a backdrop click.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      className="gs-dialog"
    >
      <div className="bg-surface border-line w-full rounded-2xl border shadow-float">
        <div className="border-line border-b px-5 py-4">
          <h2 id="modal-title" className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p id="modal-description" className="text-muted mt-1 text-sm">
              {description}
            </p>
          )}
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </dialog>
  );
}
