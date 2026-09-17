import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchROUTE, getCachedRoutes, getCachedStops, isCacheStale } from './fetch';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ status, text: async () => JSON.stringify(body) }) as Response;

const rawResponse = (body: string, status = 200): Response =>
  ({ status, text: async () => body }) as Response;

describe('fetchJson (exercised via fetchROUTE)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses a valid JSON response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ type: 'a', version: '1', generated_timestamp: 't', data: [] })
    );
    const result = await fetchROUTE();
    expect(result.data).toEqual([]);
  });

  it('throws a clear error when the server returns HTML instead of JSON', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(rawResponse('<html>Error</html>', 502));
    await expect(fetchROUTE()).rejects.toThrow('Server returned non-JSON (status 502)');
  });

  it('throws a clear error when the response body is malformed JSON', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(rawResponse('{not valid json'));
    await expect(fetchROUTE()).rejects.toThrow('Invalid JSON from server (status 200)');
  });
});

describe('isCacheStale', () => {
  it('is stale when there is no timestamp', () => {
    expect(isCacheStale(undefined)).toBe(true);
  });

  it('is not stale just under 24 hours old', () => {
    const timestamp = new Date(Date.now() - (24 * 60 * 60 * 1000 - 1000)).toISOString();
    expect(isCacheStale(timestamp)).toBe(false);
  });

  it('is stale when older than 24 hours', () => {
    const timestamp = new Date(Date.now() - (24 * 60 * 60 * 1000 + 1000)).toISOString();
    expect(isCacheStale(timestamp)).toBe(true);
  });
});

describe('getCachedRoutes / getCachedStops', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('returns fresh cached routes without hitting the network', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await AsyncStorage.setItem(
      'bus_routes_cache',
      JSON.stringify({
        data: [{ route: '1' }],
        generatedTimestamp: 'gen-1',
        cacheTimestamp: new Date().toISOString(),
      })
    );

    const result = await getCachedRoutes();

    expect(result).toEqual({ routes: [{ route: '1' }], generatedTimestamp: 'gen-1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and caches routes when there is no cache', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ type: 'a', version: '1', generated_timestamp: 'gen-2', data: [{ route: '2' }] })
    );

    const result = await getCachedRoutes();

    expect(result).toEqual({ routes: [{ route: '2' }], generatedTimestamp: 'gen-2' });
    const saved = JSON.parse((await AsyncStorage.getItem('bus_routes_cache'))!);
    expect(saved.data).toEqual([{ route: '2' }]);
  });

  it('refetches stops when the cache is stale', async () => {
    await AsyncStorage.setItem(
      'bus_stops_cache',
      JSON.stringify({
        data: [{ stop: 'old' }],
        generatedTimestamp: 'old-gen',
        cacheTimestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      })
    );
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ type: 'a', version: '1', generated_timestamp: 'new-gen', data: [{ stop: 'new' }] })
    );

    const result = await getCachedStops();

    expect(result).toEqual({ stops: [{ stop: 'new' }], generatedTimestamp: 'new-gen' });
  });
});
