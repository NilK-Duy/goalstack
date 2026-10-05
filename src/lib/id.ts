/**
 * Collision-resistant id. Uses `crypto.randomUUID` where available and falls
 * back to a timestamp + random suffix (older Safari, non-secure contexts).
 */
export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}_${uuid}`;
}
