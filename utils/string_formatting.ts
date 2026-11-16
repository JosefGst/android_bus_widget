// Utility for string formatting
import type { Language } from './language'

/**
 * Removes any substring in parentheses from a stop name, ASCII or full-width (used in Chinese names).
 * E.g. "Foo (PA215)" => "Foo"
 */
export function normalizeStopName(name: string): string {
  return typeof name === 'string' ? name.replace(/\s*(\([^)]*\)|（[^）]*）)/g, '').trim() : '';
}

// Abbreviations KMB writes in English place names; they stay in capitals.
const ABBREVIATIONS = new Set(['MTR', 'HKU', 'HKUST', 'BBI', 'KMB', 'PLB', 'HK', 'II', 'III', 'YMCA', 'YWCA'])

const titleCaseWord = (word: string): string =>
  ABBREVIATIONS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()

/** KMB sends English names in capitals ("CAUSEWAY BAY"); show them in title case. Chinese names pass through. */
export function displayPlaceName(name: string, language: Language): string {
  if (language !== 'en') return name
  return name.replace(/[A-Za-z]+/g, titleCaseWord)
}
