const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Validates a user-typed URL and returns it in canonical form, or null.
 *
 * A bare host like "docs.google.com/x" gets an https:// prefix so people don't
 * have to type it. The protocol allowlist is the point of the function: these
 * strings become `href`s, and `javascript:` or `data:` URLs would otherwise run
 * when a saved link is clicked.
 */
export function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** The host of a URL, for showing alongside a link's label. */
export function describeUrlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
