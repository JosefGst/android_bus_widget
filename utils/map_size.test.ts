import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_MAP_FRACTION, growForMarker, loadMapSize, MAP_SIZE_KEY, saveMapSize, snapFraction } from './map_size'

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('snapFraction', () => {
  it.each([
    [0.1, 1 / 3],
    [0.4, 1 / 3],
    [0.45, 1 / 2],
    [0.6, 1 / 2],
    [0.7, 0.85],
    [1.2, 0.85],
  ])('snaps %p to the nearest size', (fraction, expected) => {
    expect(snapFraction(fraction)).toBeCloseTo(expected)
  })
})

describe('growForMarker', () => {
  it('grows the smallest size to half', () => {
    expect(growForMarker(1 / 3)).toBeCloseTo(1 / 2)
  })

  it.each([1 / 2, 0.85])('leaves %p unchanged', fraction => {
    expect(growForMarker(fraction)).toBe(fraction)
  })
})

describe('loadMapSize / saveMapSize', () => {
  it('defaults to a third when nothing is saved', async () => {
    expect(await loadMapSize()).toBeCloseTo(DEFAULT_MAP_FRACTION)
    expect(DEFAULT_MAP_FRACTION).toBeCloseTo(1 / 3)
  })

  it('returns the saved size', async () => {
    await saveMapSize(0.85)
    expect(await loadMapSize()).toBeCloseTo(0.85)
  })

  it.each(['nope', '5', '-1', ''])('ignores a bad stored value %p', async raw => {
    await AsyncStorage.setItem(MAP_SIZE_KEY, raw)
    expect(await loadMapSize()).toBeCloseTo(DEFAULT_MAP_FRACTION)
  })

  it('snaps a stored value that is not a snap size', async () => {
    await AsyncStorage.setItem(MAP_SIZE_KEY, '0.55')
    expect(await loadMapSize()).toBeCloseTo(1 / 2)
  })

  it('falls back to the default when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'))
    jest.spyOn(console, 'error').mockImplementationOnce(() => {})
    expect(await loadMapSize()).toBeCloseTo(DEFAULT_MAP_FRACTION)
  })
})
