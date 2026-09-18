// Pure route-code search logic shared between the home screen's search box and its keypads.

import type { ROUTS } from './fetch';

// Filter routes whose code starts with the given query (case-insensitive).
// A prefix match, rather than a substring match, keeps a single typed letter
// (e.g. "N") from also matching unrelated routes through their origin/destination names.
export function filterRoutesByQuery(routes: ROUTS[], query: string): ROUTS[] {
  const q = query.trim().toUpperCase();
  if (!q) return routes;
  return routes.filter(item => item.route.toUpperCase().startsWith(q));
}

// Letters that can validly follow the given route-code prefix, e.g. "272" -> ['P', 'X'].
// With an empty prefix, this surfaces the leading letter of routes that start with one, e.g. "N24" -> ['N'].
export function getAvailableLetters(routes: ROUTS[], query: string): string[] {
  const prefix = query.trim().toUpperCase();
  const letters = new Set<string>();
  routes.forEach(item => {
    const route = item.route.toUpperCase();
    if (route.length > prefix.length && route.startsWith(prefix)) {
      const nextChar = route.charAt(prefix.length);
      if (/[A-Z]/.test(nextChar)) {
        letters.add(nextChar);
      }
    }
  });
  return Array.from(letters).sort();
}
