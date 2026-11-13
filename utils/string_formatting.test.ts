import { normalizeStopName } from './string_formatting';

describe('normalizeStopName', () => {
  it('strips a trailing parenthetical suffix', () => {
    expect(normalizeStopName('Central (Near Pier)')).toBe('Central');
  });

  it('leaves a name without parentheses unchanged', () => {
    expect(normalizeStopName('Causeway Bay')).toBe('Causeway Bay');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeStopName('  Admiralty  ')).toBe('Admiralty');
  });

  it('strips multiple parenthetical groups', () => {
    expect(normalizeStopName('Foo (PA215) (Outbound)')).toBe('Foo');
  });

  it('strips full-width parentheses used in Chinese names', () => {
    expect(normalizeStopName('尖沙咀東（麼地道）')).toBe('尖沙咀東');
  });

  it('returns an empty string for non-string input', () => {
    expect(normalizeStopName(undefined as unknown as string)).toBe('');
  });
});
