import { displayPlaceName, normalizeStopName } from './string_formatting';

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

describe('displayPlaceName', () => {
  it('writes an English place name in title case', () => {
    expect(displayPlaceName('CAUSEWAY BAY', 'en')).toBe('Causeway Bay')
    expect(displayPlaceName('TUEN MUN TOWN CENTRE', 'en')).toBe('Tuen Mun Town Centre')
  })

  it('keeps known abbreviations in capitals', () => {
    expect(displayPlaceName('TSUEN WAN MTR STATION', 'en')).toBe('Tsuen Wan MTR Station')
    expect(displayPlaceName('HKU', 'en')).toBe('HKU')
  })

  it('capitalizes each part of a hyphenated or bracketed word', () => {
    expect(displayPlaceName('SHA TIN (CITY ONE)', 'en')).toBe('Sha Tin (City One)')
    expect(displayPlaceName('TAI WAI-SHA TIN', 'en')).toBe('Tai Wai-Sha Tin')
  })

  it('leaves Chinese names unchanged', () => {
    expect(displayPlaceName('銅鑼灣', 'tc')).toBe('銅鑼灣')
    expect(displayPlaceName('铜锣湾', 'sc')).toBe('铜锣湾')
  })
})
