import type { ROUTS } from './fetch';
import { filterRoutesByQuery, getAvailableLetters } from './route_search';

const route = (route: string, orig_en: string, dest_en: string): ROUTS => ({
  route,
  bound: 'O',
  service_type: '1',
  orig_en,
  dest_en,
  seq: '1',
  stop: 'STOP1',
});

const ROUTES: ROUTS[] = [
  route('272P', 'TUEN MUN', 'CAUSEWAY BAY'),
  route('272X', 'TUEN MUN', 'CENTRAL'),
  route('967', 'TIN SHUI WAI', 'ADMIRALTY'),
  route('N29', 'MONG KOK', 'TSUEN WAN'),
];

describe('filterRoutesByQuery', () => {
  it('returns every route for an empty query', () => {
    expect(filterRoutesByQuery(ROUTES, '')).toEqual(ROUTES);
  });

  it('returns every route for a whitespace-only query', () => {
    expect(filterRoutesByQuery(ROUTES, '   ')).toEqual(ROUTES);
  });

  it('matches routes by a case-insensitive code prefix', () => {
    expect(filterRoutesByQuery(ROUTES, '272').map(r => r.route)).toEqual(['272P', '272X']);
    expect(filterRoutesByQuery(ROUTES, 'n').map(r => r.route)).toEqual(['N29']);
  });

  it('narrows to an exact match once the full code is typed', () => {
    expect(filterRoutesByQuery(ROUTES, '272X').map(r => r.route)).toEqual(['272X']);
  });

  it('does not match a route via its origin or destination name', () => {
    // "n" is common in destination names (e.g. "TUEN MUN", "CENTRAL") but should
    // only ever match routes whose code starts with it.
    expect(filterRoutesByQuery(ROUTES, 'n')).toEqual([route('N29', 'MONG KOK', 'TSUEN WAN')]);
  });

  it('returns no routes when nothing matches the prefix', () => {
    expect(filterRoutesByQuery(ROUTES, '999')).toEqual([]);
  });
});

describe('getAvailableLetters', () => {
  it('surfaces the leading letter of letter-led routes when no query is typed', () => {
    expect(getAvailableLetters(ROUTES, '')).toEqual(['N']);
  });

  it('surfaces the letters that can follow a digit prefix', () => {
    expect(getAvailableLetters(ROUTES, '272')).toEqual(['P', 'X']);
  });

  it('is case-insensitive on the query', () => {
    expect(getAvailableLetters(ROUTES, '272'.toLowerCase())).toEqual(['P', 'X']);
  });

  it('returns no letters once the full route code is typed', () => {
    expect(getAvailableLetters(ROUTES, '272X')).toEqual([]);
  });

  it('returns no letters when the next character is a digit', () => {
    expect(getAvailableLetters(ROUTES, 'N')).toEqual([]);
  });

  it('returns no letters when the prefix matches nothing', () => {
    expect(getAvailableLetters(ROUTES, '999')).toEqual([]);
  });
});
