import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  loadRoutesToFetch,
  parseStoredRoutes,
  ROUTES_KEY,
  saveRoutesToFetch,
} from './routes_storage';

describe('parseStoredRoutes', () => {
  it('returns null when nothing was stored', () => {
    expect(parseStoredRoutes(null)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseStoredRoutes('{not valid json')).toBeNull();
  });

  it('returns null when the stored value is not an array', () => {
    expect(parseStoredRoutes(JSON.stringify({ stop: 'a', route: 'b', service_type: '1' }))).toBeNull();
  });

  it('returns null when an entry is missing a required field', () => {
    const saved = JSON.stringify([{ stop: 'a', route: 'b' }]);
    expect(parseStoredRoutes(saved)).toBeNull();
  });

  it('parses and normalizes a valid list, dropping extra fields', () => {
    const saved = JSON.stringify([
      { stop: 'a', route: 'b', service_type: '1', extra: 'ignored' },
    ]);
    expect(parseStoredRoutes(saved)).toEqual([{ stop: 'a', route: 'b', service_type: '1' }]);
  });
});

describe('loadRoutesToFetch / saveRoutesToFetch', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing has been saved', async () => {
    expect(await loadRoutesToFetch()).toBeNull();
  });

  it('round-trips a saved list', async () => {
    const routes = [{ stop: 'a', route: 'b', service_type: '1' }];
    await saveRoutesToFetch(routes);
    expect(await loadRoutesToFetch()).toEqual(routes);
    expect(await AsyncStorage.getItem(ROUTES_KEY)).toEqual(JSON.stringify(routes));
  });
});
