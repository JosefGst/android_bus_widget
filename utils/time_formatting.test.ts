import { formatEtaToHKTime, getMinutesUntilArrival } from './time_formatting';

describe('formatEtaToHKTime', () => {
  it('returns N/A for an empty string', () => {
    expect(formatEtaToHKTime('')).toBe('N/A');
  });

  it('returns the raw input for an invalid date string', () => {
    expect(formatEtaToHKTime('not-a-date')).toBe('not-a-date');
  });

  it('formats a valid ISO timestamp as HK local time', () => {
    const formatted = formatEtaToHKTime('2026-01-01T12:00:00Z');
    // Hong Kong is UTC+8, so 12:00 UTC is 20:00 local.
    expect(formatted).toBe('20:00:00');
  });
});

describe('getMinutesUntilArrival', () => {
  it('returns null for an empty eta', () => {
    expect(getMinutesUntilArrival('')).toBeNull();
  });

  it('returns null for an invalid eta date', () => {
    expect(getMinutesUntilArrival('not-a-date')).toBeNull();
  });

  it('computes whole minutes between referenceTime and eta', () => {
    const minutes = getMinutesUntilArrival('2026-01-01T12:10:00Z', '2026-01-01T12:00:00Z');
    expect(minutes).toBe(10);
  });

  it('rounds to the nearest minute', () => {
    const minutes = getMinutesUntilArrival('2026-01-01T12:00:40Z', '2026-01-01T12:00:00Z');
    expect(minutes).toBe(1);
  });

  it('clamps negative differences (eta already passed) to 0', () => {
    const minutes = getMinutesUntilArrival('2026-01-01T12:00:00Z', '2026-01-01T12:10:00Z');
    expect(minutes).toBe(0);
  });

  it('falls back to real "now" when referenceTime is invalid', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const minutes = getMinutesUntilArrival('2026-01-01T12:05:00Z', 'not-a-date');
    expect(minutes).toBe(5);
    jest.useRealTimers();
  });

  it('uses the real clock when no referenceTime is given', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const minutes = getMinutesUntilArrival('2026-01-01T12:03:00Z');
    expect(minutes).toBe(3);
    jest.useRealTimers();
  });
});
