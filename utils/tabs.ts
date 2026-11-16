// The bottom tab bar: which screens are tabs, and which one is highlighted.
// Other screens (Routes Stop) open as pages over the tabs and are not in the bar.

export const TAB_ROUTES = ['index', 'find_route'] as const
export type TabRoute = (typeof TAB_ROUTES)[number]

const isTab = (name: string): name is TabRoute => (TAB_ROUTES as readonly string[]).includes(name)

/** The tab to highlight, given the screens visited oldest first (the last is the focused one). */
export function selectedTab(visited: readonly string[]): TabRoute {
  return [...visited].reverse().find(isTab) ?? 'index'
}
