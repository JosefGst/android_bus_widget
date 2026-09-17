import { buildGroupedEtas, getRouteETAs } from './eta_grouping';
import type { ETA } from './fetch';

const eta = (overrides: Partial<ETA & { stop: string }>): ETA & { stop: string } => ({
  route: '272P',
  dir: 'O',
  service_type: '1',
  dest_en: 'Somewhere',
  eta: '',
  data_timestamp: '',
  stop: 'stop-1',
  ...overrides,
});

describe('getRouteETAs', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty array when there are no etas', () => {
    expect(getRouteETAs(undefined)).toEqual([]);
    expect(getRouteETAs([])).toEqual([]);
  });

  it('keeps only the earliest arrival per route+direction', () => {
    const etas = [
      eta({ route: '272P', dir: 'O', eta: '2026-01-01T12:20:00Z' }),
      eta({ route: '272P', dir: 'O', eta: '2026-01-01T12:05:00Z' }),
    ];
    expect(getRouteETAs(etas)).toEqual([{ route: '272P', minutes: 5 }]);
  });

  it('keeps separate entries for the same route with different directions', () => {
    const etas = [
      eta({ route: '272P', dir: 'O', eta: '2026-01-01T12:05:00Z' }),
      eta({ route: '272P', dir: 'I', eta: '2026-01-01T12:10:00Z' }),
    ];
    expect(getRouteETAs(etas)).toHaveLength(2);
  });

  it('sorts by soonest arrival, with unknown (null) minutes last', () => {
    const etas = [
      eta({ route: 'B', dir: 'O', eta: 'invalid-date' }),
      eta({ route: 'A', dir: 'O', eta: '2026-01-01T12:05:00Z' }),
    ];
    expect(getRouteETAs(etas)).toEqual([
      { route: 'A', minutes: 5 },
      { route: 'B', minutes: null },
    ]);
  });
});

describe('buildGroupedEtas', () => {
  it('seeds one group per requested stop, normalizing the stop name', () => {
    const routesToFetch = [{ stop: 'stop-1', route: '272P', service_type: '1' }];
    const grouped = buildGroupedEtas(routesToFetch, { 'stop-1': 'Central (PA215)' }, []);
    expect(grouped).toEqual({ Central: [] });
  });

  it('buckets each eta into the group matching its stop', () => {
    const routesToFetch = [
      { stop: 'stop-1', route: '272P', service_type: '1' },
      { stop: 'stop-2', route: '272X', service_type: '1' },
    ];
    const stopNameMap = { 'stop-1': 'Central', 'stop-2': 'Admiralty' };
    const allData = [eta({ stop: 'stop-1' }), eta({ stop: 'stop-2', route: '272X' })];

    const grouped = buildGroupedEtas(routesToFetch, stopNameMap, allData);

    expect(grouped.Central).toEqual([allData[0]]);
    expect(grouped.Admiralty).toEqual([allData[1]]);
  });

  it('falls back to the raw stop id when no name is known', () => {
    const routesToFetch = [{ stop: 'stop-1', route: '272P', service_type: '1' }];
    const grouped = buildGroupedEtas(routesToFetch, {}, []);
    expect(grouped).toEqual({ 'stop-1': [] });
  });

  it('drops etas for stops that were not part of the requested routes', () => {
    const routesToFetch = [{ stop: 'stop-1', route: '272P', service_type: '1' }];
    const allData = [eta({ stop: 'unrelated-stop' })];
    const grouped = buildGroupedEtas(routesToFetch, { 'stop-1': 'Central' }, allData);
    expect(grouped).toEqual({ Central: [] });
  });
});
