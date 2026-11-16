import { selectedTab, TAB_ROUTES } from './tabs'

describe('selectedTab', () => {
  it('lists My Buses first, then Find a Route', () => {
    expect(TAB_ROUTES).toEqual(['index', 'find_route'])
  })

  it('is the focused screen when that screen is a tab', () => {
    expect(selectedTab(['index', 'find_route'])).toBe('find_route')
  })

  it('is the tab the user came from while a page such as Routes Stop is open', () => {
    expect(selectedTab(['index', 'find_route', 'routes_stop'])).toBe('find_route')
    expect(selectedTab(['find_route', 'index', 'routes_stop'])).toBe('index')
  })

  it('is My Buses when no tab is in the history (Routes Stop opened by a link)', () => {
    expect(selectedTab(['routes_stop'])).toBe('index')
    expect(selectedTab([])).toBe('index')
  })
})
