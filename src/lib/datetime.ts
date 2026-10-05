const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Formats an instant for an `<input type="datetime-local">`, which expects
 * local wall-clock time with no zone suffix.
 */
export function toDateTimeInputValue(ms: number): string {
  const date = new Date(ms);
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
}

/**
 * Reads a `datetime-local` value as local wall-clock time.
 *
 * Built from explicit components rather than `new Date(value)`: the string
 * carries no offset, and interpreting it as UTC — as an earlier version did by
 * appending "Z" — shifted every goal by the viewer's offset.
 */
export function fromDateTimeInputValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match.map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Reject impossible dates that the Date constructor would silently roll over
  // (for example 2026-02-31 becoming March 3rd).
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date.getTime();
}

/** Today at 09:00 local — a sensible default start for a new goal. */
export function defaultGoalStart(): number {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date.getTime();
}
