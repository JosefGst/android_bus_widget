import { formatClockTime, formatEtaToHKTime, getMinutesUntilArrival } from './time_formatting';

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

describe('formatClockTime', () => {
  // 06:41 UTC is 2:41 pm in Hong Kong.
  const afternoon = '2026-11-13T06:41:00Z'

  it('gives a 12-hour Hong Kong time without seconds in English', () => {
    expect(formatClockTime(afternoon, 'en')).toBe('2:41 pm')
    expect(formatClockTime('2026-11-13T01:05:00Z', 'en')).toBe('9:05 am')
  })

  it('marks morning and afternoon in Chinese', () => {
    expect(formatClockTime(afternoon, 'tc')).toBe('下午2:41')
    expect(formatClockTime(afternoon, 'sc')).toBe('下午2:41')
  })

  it('gives an empty string when there is no valid time', () => {
    expect(formatClockTime('', 'en')).toBe('')
    expect(formatClockTime('not-a-date', 'en')).toBe('')
  })
})

describe('formatClockTime without Chinese locale data', () => {
  // Hermes on Android formats every locale like English, so "下午" must not come from Intl.
  afterEach(() => jest.restoreAllMocks())

  it('still marks morning and afternoon in Chinese', () => {
    const original = Date.prototype.toLocaleTimeString
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date, _locales, options) {
      return original.call(this, 'en-US', options)
    })
    expect(formatClockTime('2026-11-13T06:41:00Z', 'tc')).toBe('下午2:41')
    expect(formatClockTime('2026-11-13T01:05:00Z', 'sc')).toBe('上午9:05')
    expect(formatClockTime('2026-11-13T06:41:00Z', 'en')).toBe('2:41 pm')
  })
})
