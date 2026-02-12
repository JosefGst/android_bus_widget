// Utility for string formatting

/**
 * Removes any substring in parentheses from a stop name.
 * E.g. "Foo (PA215)" => "Foo"
 */
export function normalizeStopName(name: string): string {
  return typeof name === 'string' ? name.replace(/\s*\([^)]*\)/g, '').trim() : '';
}
