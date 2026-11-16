// The home-screen widget's rows: one per Route, with its Stop and next bus.

import { routeRow } from './arrival_display'
import type { StopGroup } from './favorite_board'
import type { Language } from './language'
import { displayPlaceName } from './string_formatting'
import type { Strings } from './strings'

export type WidgetRow = { key: string; route: string; stopName: string; time: string; isNow: boolean }

/** Rows in board order. Minutes are counted from `now`, so a widget drawn later than the board stays right. */
export function widgetRows(groups: readonly StopGroup[], now: string, language: Language, strings: Strings): WidgetRow[] {
  return groups.flatMap(group =>
    group.routes.map(route => {
      const { next } = routeRow(route.arrivals, now)
      return {
        key: `${route.stop}|${route.route}|${route.bound}`,
        route: route.route,
        stopName: displayPlaceName(group.stopName, language),
        time: next.kind === 'now' ? strings.arrivingNow : next.kind === 'minutes' ? strings.minutesShort(String(next.minutes)) : '--',
        isNow: next.kind === 'now',
      }
    }),
  )
}
