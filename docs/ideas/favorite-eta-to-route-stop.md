# Favorite Stop → Routes Stop map

> **Status: planned.**

## Problem Statement
How might we let a user tap a Favorite on My Favorites and land on its Route map with that exact Stop selected, so they can see where it is and its ETAs in detail?

## Recommended Direction
The Stop is the anchor. My Favorites keeps its Stop groups; inside each group, every Route row (the Route with all its arrival lines) becomes one tap target. A single target per Route is easier to hit than one link per ETA line, and every line of a Route would open the same place anyway.

Tapping pushes `/routes_stop` with `route`, `bound`, `service_type` and `stop`. Because the screen is pushed, back returns to My Favorites. On Routes Stop, once the Stop list has loaded, the `stop` param runs the existing marker-tap path (`onMarkerPress`): it selects the Stop, zooms the map to it, loads its ETA, grows a small map to ½ (not saved) and scrolls the row into view. Map size and focus are not changed in any new way.

The board must say which Stop and direction a row belongs to. Today `RouteArrivals` only has `route` + `arrivals`, and a `StopGroup` can merge several Stop ids that share a name. Rows gain `stop`, `bound` (from the ETA `dir`) and `service_type` and are keyed `stop|route|dir`, so a row never mixes Stop ids.

## Key Assumptions to Validate
- [ ] `router.push` from the My Favorites tab gives a working back stack on Android (check on the Honor tablet).
- [ ] The ETA `dir` (`I`/`O`) matches the route-stop `bound` that `routes_stop.tsx` expects (check with real data).
- [ ] If the Stop is not in the loaded Stop list, nothing is selected and nothing crashes.

## MVP Scope
In: tappable Route rows under each Stop on My Favorites; preselection on Routes Stop through the existing marker-tap behavior; unit tests for the board fields; one Maestro flow.
Out: everything in "Not Doing".

## Not Doing (and Why)
- New Stop detail screen — Routes Stop already shows the map and ETAs.
- One link per ETA line — one target per Route + Stop is enough and easier to hit.
- Storing `bound` in `Favorite` — the storage key and format must not change.
- Tapping the Stop header with a Route chooser — adds a step.
- New map size or focus behavior — reuse the marker-tap default.
- Widget tap-through — separate feature.

## Plan

### Task 1 — Board rows know their Stop and direction (`utils/favorite_board.ts`)
- Add `stop`, `bound`, `service_type` to `RouteArrivals`; group rows by `stop|route|dir`.
- `bound` = ETA `dir`; `service_type` comes from the Favorite.
- Tests in `utils/favorite_board.test.ts`: fields are set; two Stop ids with the same name give separate rows; sorting is unchanged.
- Check that the widget (`widget/`) still renders: it only reads `route` / `arrivals`.
- Verify: `npm test`, `npx tsc --noEmit`.

### Task 2 — Tappable Route rows (`app/my_favorites.tsx`), depends on 1
- Wrap each Route's arrival lines in one `Pressable` with a chevron and `accessibilityLabel` `"Open <route> at <Stop name>"`.
- `onPress`: `router.push({ pathname: '/routes_stop', params: { route, bound, service_type, stop } })`.
- Verify: `npm run lint`, typecheck.

### Task 3 — Preselect the Stop (`app/routes_stop.tsx`), parallel with 2
- Read the `stop` param. When `data` has loaded and contains the Stop, call `onMarkerPress(stop)` once per `route|bound|service_type|stop`, tracked with a ref so later taps are not overridden.
- No other changes to the map, its size or the handle.
- Verify: lint, typecheck; Web: open `/routes_stop?route=N29&bound=O&service_type=1&stop=<mock id>`.

### Task 4 — Tests and docs, after 2 and 3
- Playwright e2e (`e2e/`, mocked data): tap a Favorite row and expect Routes Stop with that Stop expanded.
- Maestro flow `.maestro/favorite_to_route_stop.yaml`: tap the row, assert the Stop is expanded, press back, assert My Favorites.
- Update the AGENTS.md data-flow note and mark this doc implemented.
- Verify: `npm test`, `npm run test:e2e`, and Maestro on the device.

## Open Questions
- None blocking.
