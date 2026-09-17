import AsyncStorage from '@react-native-async-storage/async-storage';

import { appendFavoriteStopId, loadFavoriteStopIds } from './storage';

describe('loadFavoriteStopIds', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty array when nothing is stored', async () => {
    expect(await loadFavoriteStopIds()).toEqual([]);
  });

  it('returns the stored ids', async () => {
    await AsyncStorage.setItem('FAVORITE_STOP_IDS', JSON.stringify(['a', 'b']));
    expect(await loadFavoriteStopIds()).toEqual(['a', 'b']);
  });

  it('returns an empty array when the stored value is malformed JSON', async () => {
    await AsyncStorage.setItem('FAVORITE_STOP_IDS', '{not valid json');
    expect(await loadFavoriteStopIds()).toEqual([]);
  });
});

describe('appendFavoriteStopId', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('adds a new id to an empty list', async () => {
    const success = await appendFavoriteStopId('stop-1');
    expect(success).toBe(true);
    expect(await loadFavoriteStopIds()).toEqual(['stop-1']);
  });

  it('is idempotent for an id that already exists', async () => {
    await appendFavoriteStopId('stop-1');
    const success = await appendFavoriteStopId('stop-1');
    expect(success).toBe(true);
    expect(await loadFavoriteStopIds()).toEqual(['stop-1']);
  });

  it('serializes concurrent appends so no id is dropped', async () => {
    await Promise.all([
      appendFavoriteStopId('stop-1'),
      appendFavoriteStopId('stop-2'),
      appendFavoriteStopId('stop-3'),
    ]);
    const ids = await loadFavoriteStopIds();
    expect(ids.sort()).toEqual(['stop-1', 'stop-2', 'stop-3']);
  });

  it('recovers from a corrupted existing value by starting a fresh list', async () => {
    await AsyncStorage.setItem('FAVORITE_STOP_IDS', '{not valid json');
    const success = await appendFavoriteStopId('stop-1');
    expect(success).toBe(true);
    expect(await loadFavoriteStopIds()).toEqual(['stop-1']);
  });
});
