// The home-screen widget's content: one section per Stop, each Route with its next bus.

import { routeRow } from './arrivals'
import type { StopGroup } from './favorite_board'
import type { Strings } from './strings'

export type WidgetRow = { key: string; route: string; time: string; isNow: boolean }
export type WidgetSection = { key: string; stopName: string; rows: WidgetRow[] }

/**
 * Sections in board order. The Stop name is a heading over its Routes rather than part of each row,
 * so it gets the widget's full width: launchers can draw the widget much smaller than its slot.
 * Minutes are counted from `now`, so a widget drawn later than the board stays right.
 */
export function widgetSections(groups: readonly StopGroup[], now: string, strings: Strings): WidgetSection[] {
  return groups
    .filter(group => group.routes.length > 0)
    .map(group => ({
      key: group.stopName,
      stopName: group.stopName,
      rows: group.routes.map(route => {
        const { next } = routeRow(route.etas, now)
        return {
          key: `${route.stop}|${route.route}|${route.bound}`,
          route: route.route,
          time: next.kind === 'now' ? strings.arrivingNow : next.kind === 'minutes' ? strings.minutesShort(String(next.minutes)) : '--',
          isNow: next.kind === 'now',
        }
      }),
    }))
}
