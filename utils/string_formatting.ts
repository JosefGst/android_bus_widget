// Utility for string formatting

/**
 * Removes any substring in parentheses from a stop name, ASCII or full-width (used in Chinese names).
 * E.g. "Foo (PA215)" => "Foo"
 */
export function normalizeStopName(name: string): string {
  return typeof name === 'string' ? name.replace(/\s*(\([^)]*\)|（[^）]*）)/g, '').trim() : '';
}
