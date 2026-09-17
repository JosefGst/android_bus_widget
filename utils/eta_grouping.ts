// Pure ETA-grouping logic shared between the widget renderer and the widget task handler.

import type { ETA } from './fetch';
import { normalizeStopName } from './string_formatting';
import { getMinutesUntilArrival } from './time_formatting';

export type RouteETA = { route: string; minutes: number | null };

// Group ETAs by route+direction and keep only the earliest arrival per group.
export const getRouteETAs = (etaList: ETA[] | undefined): RouteETA[] => {
  if (!etaList || etaList.length === 0) return [];
  const routeMap = new Map<string, RouteETA>();
  etaList.forEach(eta => {
    const minutes = getMinutesUntilArrival(eta.eta);
    const routeKey = `${eta.route}${eta.dir}`;
    if (
      !routeMap.has(routeKey) ||
      (minutes !== null &&
        (routeMap.get(routeKey)?.minutes === null ||
          minutes < ((routeMap.get(routeKey)?.minutes ?? Infinity)))
      )
    ) {
      routeMap.set(routeKey, { route: eta.route, minutes });
    }
  });
  return Array.from(routeMap.values()).sort((a, b) => {
    if (a.minutes === null) return 1;
    if (b.minutes === null) return -1;
    return a.minutes - b.minutes;
  });
};

// Seed one group per requested stop (via normalizeStopName), then bucket each ETA into its group.
export const buildGroupedEtas = (
  routesToFetch: { stop: string; route: string; service_type: string }[],
  stopNameMap: Record<string, string>,
  allData: (ETA & { stop: string })[]
): Record<string, ETA[]> => {
  const groupedEtas: Record<string, ETA[]> = {};
  routesToFetch.forEach(routeObj => {
    const stopId = routeObj.stop;
    const stopNameRaw = stopNameMap[stopId] ?? stopId;
    const key = normalizeStopName(stopNameRaw);
    if (!groupedEtas[key]) groupedEtas[key] = [];
  });
  allData.forEach(eta => {
    const stopId = eta.stop;
    const stopNameRaw = stopNameMap[stopId] ?? stopId;
    const key = normalizeStopName(stopNameRaw);
    if (groupedEtas[key]) groupedEtas[key].push(eta);
  });
  return groupedEtas;
};
