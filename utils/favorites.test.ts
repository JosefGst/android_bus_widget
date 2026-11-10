import AsyncStorage from '@react-native-async-storage/async-storage'

import { add, list, listForWidget, onFavoritesChanged, remove, STARTER_FAVORITES } from './favorites'

// The storage key is part of the persisted contract: existing users' Favorites live under it.
const STORAGE_KEY = 'baseRoutesToFetch'

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('list', () => {
  it('returns the starter Favorites when nothing has ever been saved', async () => {
    expect(await list()).toEqual(STARTER_FAVORITES)
  })

  it('returns an empty list when the user saved an empty list', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '[]')
    expect(await list()).toEqual([])
  })

  it('returns the starter Favorites when the stored value is malformed JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid json')
    expect(await list()).toEqual(STARTER_FAVORITES)
  })

  it('returns the starter Favorites when the stored value is not an array', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ stop: 'a', route: 'b', service_type: '1' }))
    expect(await list()).toEqual(STARTER_FAVORITES)
  })

  it('returns the starter Favorites when an entry is missing a required field', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([{ stop: 'a', route: 'b' }]))
    expect(await list()).toEqual(STARTER_FAVORITES)
  })

  it('returns a saved list, dropping extra fields', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ stop: 'a', route: 'b', service_type: '1', extra: 'ignored' }]),
    )
    expect(await list()).toEqual([{ stop: 'a', route: 'b', service_type: '1' }])
  })
})

describe('add', () => {
  const fav = { route: '967', service_type: '1', stop: 'STOP_A' }

  beforeEach(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '[]')
  })

  it('persists a new Favorite', async () => {
    expect(await add(fav)).toBe(true)
    expect(await list()).toEqual([fav])
  })

  it('leaves a single entry when the same Favorite is added twice', async () => {
    await add(fav)
    expect(await add(fav)).toBe(true)
    expect(await list()).toEqual([fav])
  })

  it('treats a different service type at the same Stop as a different Favorite', async () => {
    await add(fav)
    await add({ ...fav, service_type: '2' })
    expect(await list()).toHaveLength(2)
  })

  it('brings back a Favorite that was removed and then added again', async () => {
    await add(fav)
    await remove(fav)
    await add(fav)
    expect(await list()).toEqual([fav])
  })

  it('keeps every Favorite when several are added at once', async () => {
    const favs = ['S1', 'S2', 'S3', 'S4'].map(stop => ({ route: '272P', service_type: '1', stop }))
    await Promise.all(favs.map(f => add(f)))
    expect(await list()).toEqual(expect.arrayContaining(favs))
    expect(await list()).toHaveLength(4)
  })

  it('starts from the starter Favorites when nothing has ever been saved', async () => {
    await AsyncStorage.clear()
    await add(fav)
    expect(await list()).toEqual([...STARTER_FAVORITES, fav])
  })

  it('returns false when storage fails, without blocking the next write', async () => {
    // setItem is already a jest.fn in the official mock; a one-shot rejection needs no restore
    // (mockRestore on it would wipe its implementation for every later test).
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'))
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(await add(fav)).toBe(false)
    expect(await add(fav)).toBe(true)
    expect(await list()).toEqual([fav])

    errorLog.mockRestore()
  })
})

describe('remove', () => {
  const fav = { route: '967', service_type: '1', stop: 'STOP_A' }
  const other = { route: '272X', service_type: '1', stop: 'STOP_B' }

  beforeEach(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([fav, other]))
  })

  it('removes only the matching Favorite', async () => {
    expect(await remove(fav)).toBe(true)
    expect(await list()).toEqual([other])
  })

  it('succeeds and changes nothing when the Favorite is not in the list', async () => {
    expect(await remove({ ...fav, stop: 'NOT_THERE' })).toBe(true)
    expect(await list()).toEqual([fav, other])
  })

  it('leaves an empty list, not the starter Favorites, after removing the last one', async () => {
    await remove(fav)
    await remove(other)
    expect(await list()).toEqual([])
  })
})

describe('listForWidget', () => {
  it('returns the saved Favorites when storage answers promptly', async () => {
    const fav = { route: '967', service_type: '1', stop: 'STOP_A' }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([fav]))
    expect(await listForWidget()).toEqual([fav])
  })

  it('returns the starter Favorites when storage does not answer within 1.5s', async () => {
    jest.useFakeTimers()
    jest.mocked(AsyncStorage.getItem).mockReturnValueOnce(new Promise(() => {}))

    const result = listForWidget()
    jest.advanceTimersByTime(1500)

    await expect(result).resolves.toEqual(STARTER_FAVORITES)
    jest.useRealTimers()
  })

  it('returns the starter Favorites when storage throws', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('unavailable'))
    expect(await listForWidget()).toEqual(STARTER_FAVORITES)
  })
})

describe('onFavoritesChanged', () => {
  const fav = { route: '967', service_type: '1', stop: 'STOP_A' }
  let unsubscribe: () => void = () => {}

  beforeEach(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '[]')
  })

  afterEach(() => {
    unsubscribe()
  })

  it('notifies once after an add that changes the list', async () => {
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)

    await add(fav)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies once after a remove that changes the list', async () => {
    await add(fav)
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)

    await remove(fav)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not notify when adding a Favorite that already exists', async () => {
    await add(fav)
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)

    await add(fav)

    expect(listener).not.toHaveBeenCalled()
  })

  it('does not notify when removing a Favorite that is not there', async () => {
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)

    await remove(fav)

    expect(listener).not.toHaveBeenCalled()
  })

  it('does not notify when the write fails', async () => {
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'))
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})

    await add(fav)

    expect(listener).not.toHaveBeenCalled()
    errorLog.mockRestore()
  })

  it('stops notifying after unsubscribing', async () => {
    const listener = jest.fn()
    onFavoritesChanged(listener)()

    await add(fav)

    expect(listener).not.toHaveBeenCalled()
  })

  it('still saves and notifies other listeners when one listener throws', async () => {
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
    const broken = onFavoritesChanged(() => { throw new Error('boom') })
    const listener = jest.fn()
    unsubscribe = onFavoritesChanged(listener)

    expect(await add(fav)).toBe(true)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(await list()).toEqual([fav])
    broken()
    errorLog.mockRestore()
  })
})
