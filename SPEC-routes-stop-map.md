# Spec: Routes Stop map

**Status:** Draft, awaiting approval | **Date:** 2026-11-10

## Objective

Add a map to the Routes Stop screen with one marker for each Stop on the selected Route. Then you can find a Stop by where it is, not by its name, and pick it from the map.

**User:** the app's owner, mostly on their own Android phone. Web must work too.

**Stories:**
1. When I open a Route, I see all its Stops on a map, so I know where the bus goes.
2. I don't know my Stop's name, but I know where I am. I tap the marker there, and the list jumps to that Stop and shows its ETAs and the Favorite star.
3. I tap a Stop in the list and the map shows me where it is.
4. On a small screen I can collapse the map to see more of the list, and open it again.

**Out of scope:**
- GPS or the user's own location (a later feature).
- Google Maps.
- Offline map tiles.
- Drawing the Route's path between Stops.
- Maps on My Favorites or in the widget.

## Behaviour

| # | Trigger | Result |
|---|---------|--------|
| B1 | Route stop list finishes loading | The map shows one marker per Stop that has coordinates. The view fits all markers. |
| B2 | Tap a marker | That Stop becomes the **selected Stop**: the map zooms and centers on it (zoom 17) and highlights its marker, and the list scrolls to its row and expands it (ETAs fetched if not already loaded). |
| B3 | Tap a collapsed list row | The Stop is selected, with the same result as B2. |
| B4 | Tap the expanded row again | The selection clears: the row collapses and the marker returns to normal. The map stays where it is. |
| B5 | Tap the collapse button | The map hides and the list fills the space. The button changes to "show map". |
| B6 | Tap "show map" | The map comes back showing the current selection (zoomed on the selected Stop), or fitted to the Route if nothing is selected. |
| B7 | A Stop has no valid `lat`/`long` | The Stop gets no marker. Its row still works, and selecting it doesn't move the map. |
| B8 | The Stop cache fails to load, or no Stop has coordinates | The map area shows "Map unavailable". The list still works. |
| B9 | Map tiles or Leaflet fail to load (offline) | The map area may be blank, but the list and ETAs still work. No crash. |

There is **one selected Stop** at a time, and it is the same state as the existing `expandedStop`. The map and the list both follow it.

**Layout:**
- The map sits between the header and the list, fixed (it doesn't scroll), about ⅓ of the window height.
- The collapse/show button sits at the map's edge.
- The map is shown when the screen opens. Whether you collapsed it is not remembered between visits.

**Markers:**
- Each marker is a circle with the Stop's `seq` number, styled like the list's sequence circle, so you can match map and list at a glance.
- The selected marker uses a contrasting colour and is drawn larger and on top of the others.

## Tech decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Map library | **Leaflet 1.9.4**, **bundled**: its JS and CSS are inlined into the map page | Free, no API key. Small: 162 KB raw / ~46 KB gzipped. Doesn't depend on a CDN, and e2e tests don't need to fake one. |
| Getting Leaflet into the bundle | `leaflet@1.9.4` as an exact-version devDependency. `scripts/gen_leaflet_assets.js` writes `components/generated/leaflet_assets.ts` (exports `LEAFLET_JS` and `LEAFLET_CSS` strings), and that file is committed. | Metro can't import a `.js` file as text. A generated, committed module is simple and builds the same way every time. Re-run the script only when upgrading Leaflet. |
| Tiles on demand | Leaflet only downloads the tiles currently on screen (256 px, ~10–30 KB each) | "Only the needed part of the map" is how tile maps already work. Bundling every HK tile would be several GB. |
| Tiles | HK Lands Department basemap + English labels, WGS84 XYZ (see below) | Free, official, no key, HK-only. Both URLs checked: they return `200 image/png`. |
| Hosting the map | One self-contained HTML page (a string built by `buildMapHtml()`). Android shows it in `react-native-webview`, Web in an `<iframe srcDoc>`. | The same Leaflet code runs on both platforms, so there is only one code path for the map logic. |
| Talking to the map | JSON messages sent with `postMessage` both ways (protocol below) | Works the same in a WebView and an iframe. |
| Coordinates | `lat`/`long` from the existing `getCachedStops()` (24h cache) | Already fetched by this screen for stop names. No new API calls. |
| New dependencies | `react-native-webview` (runtime, installed with `npx expo install`) and `leaflet@1.9.4` (dev only, read by the generator script) | The WebView is needed for Android and requires a native rebuild (`npx expo run:android`). |

**Tile URLs:**
```
https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png
https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/en/WGS84/{z}/{x}/{y}.png
```
**Attribution shown on the map:** `© Map information from Lands Department`

**Message protocol** (all messages are JSON strings):
```ts
// App → map
type ToMapMessage =
  | { type: 'setMarkers'; markers: RouteMarker[] }   // replace markers, fit to all of them
  | { type: 'select'; stop: string | null }           // highlight + zoom to the Stop, or clear the highlight

// Map → app
type FromMapMessage =
  | { type: 'ready' }                                 // Leaflet loaded, ready for setMarkers
  | { type: 'markerPress'; stop: string }
```
Messages coming from the map are **untrusted input**. They are parsed and validated by `parseFromMapMessage()`, and anything invalid is ignored.

## Project structure

```
utils/route_stop_map.ts        # NEW pure logic: RouteMarker type, buildRouteMarkers(), parseFromMapMessage()
utils/route_stop_map.test.ts   # NEW unit tests
components/                    # NEW: non-route shared UI (expo-router treats every file in app/ as a route)
  generated/leaflet_assets.ts  # GENERATED by scripts/gen_leaflet_assets.js; never edit by hand
  stop_map_html.ts             # buildMapHtml(): the Leaflet page as a string, shared by both hosts
  StopMap.tsx                  # Android host: react-native-webview
  StopMap.web.tsx              # Web host: <iframe srcDoc>; same props as StopMap.tsx
app/routes_stop.tsx            # Adds the map, the collapse button, selectStop() shared by row tap and marker tap
scripts/gen_leaflet_assets.js  # NEW: copies Leaflet's dist JS/CSS into components/generated/
e2e/route-stop-map.spec.ts     # NEW Playwright test against the web build
AGENTS.md                      # Add components/ to Structure and the dependency graph
```

Dependencies only point one way: `app/` → `components/` → `utils/`. `components/` never imports from `app/`, and `widget/` never imports from `components/`.

**`StopMap` props:**
```ts
interface StopMapProps {
  markers: RouteMarker[]
  selectedStop: string | null
  onMarkerPress: (stop: string) => void
}
```

## Code style

Follow AGENTS.md: no semicolons, single quotes, `type` for shapes, explicit return types, no `as any`. Example of the target shape:

```ts
export type RouteMarker = {
  stop: string
  seq: number
  name: string
  lat: number
  lng: number
}

export function buildRouteMarkers(routeStops: ROUTS[], stops: Stop[]): RouteMarker[] {
  const byId = new Map(stops.map(s => [s.stop, s]))
  return routeStops
    .map(rs => toMarker(rs, byId.get(rs.stop)))
    .filter((m): m is RouteMarker => m !== null)
    .sort((a, b) => a.seq - b.seq)
}
```

## Testing strategy

- **Unit (Jest, `utils/route_stop_map.test.ts`):**
  - `buildRouteMarkers` orders markers by `seq` and turns `"22.3"` strings into numbers.
  - It skips Stops that are missing, have empty or non-numeric coordinates, or sit outside HK's rough bounding box (lat 22.1–22.6, lng 113.8–114.5).
  - It falls back to the Stop id when there is no name.
  - `parseFromMapMessage` accepts valid messages and returns `null` for bad JSON, unknown `type`, or a missing or non-string `stop`.
- **E2E (Playwright, web build, KMB API mocked as in `e2e/mocks.ts`):**
  - Markers appear in the map iframe.
  - Clicking a marker expands the matching row.
  - Clicking a row highlights the matching marker.
  - The collapse button hides and restores the map.
  - Tile requests are routed to a local blank PNG, so the test runs offline. Leaflet is bundled, so nothing else needs faking.
- **Manual (Android device):**
  - Pinch and pan work inside the WebView.
  - B2–B6 behave correctly.
  - In airplane mode, the list still works (B9).
- The WebView/iframe hosts themselves are not unit-tested. That matches the project's policy for UI components.

## Commands

```bash
npx expo install react-native-webview   # add the runtime dependency
npm install --save-dev --save-exact leaflet@1.9.4
node scripts/gen_leaflet_assets.js       # regenerate components/generated/leaflet_assets.ts
npm test                                 # Jest unit tests
npm run lint                             # ESLint
npx tsc --noEmit                         # Type check
npm run test:e2e                         # Playwright against the web build
npm run web                              # Manual check on Web
npx expo run:android                     # Native rebuild (needed after adding the WebView)
```

## Boundaries

- **Always:**
  - Keep marker building and message parsing in `utils/` with tests.
  - Validate messages coming from the map.
  - Run `npm test`, `npm run lint` and `npx tsc --noEmit` before each commit.
  - Show the Lands Department attribution.
- **Ask first:**
  - Adding any dependency other than `react-native-webview` and `leaflet`.
  - Bundling map tiles for offline use.
  - Changing `utils/fetch.ts` (the plan shouldn't need to).
  - Changing CI.
- **Never:**
  - Add Google Maps or any service that needs a key.
  - Add map code to `widget/`.
  - Put non-route files in `app/`.
  - Use `as any` or `@ts-ignore`.
  - Call raw `fetch()`.
  - Modify `app-example/`.

## Success criteria

1. Opening any Route shows one marker per Stop that has coordinates, numbered by `seq`, with the view fitted to all of them, on both Android and Web.
2. Tapping a marker zooms to the Stop, highlights it, and scrolls the list to that row and expands it with ETAs (B2).
3. Tapping a row highlights its marker and zooms the map to it. Tapping the expanded row again clears the highlight (B3, B4).
4. The collapse button hides and restores the map, and the restored map shows the current selection (B5, B6).
5. Missing coordinates, a failed Stop cache, or no network never break the stop list or the ETAs (B7–B9).
6. There are no API keys or paid services. The attribution is visible.
7. `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run test:e2e` all pass. The new unit tests cover `buildRouteMarkers` and `parseFromMapMessage`.

## Open questions

1. **Lands Department terms of use:** the free API asks for attribution, which is included. If you ever publish the app on the Play Store, read their terms; for personal use this should be fine.

**Resolved:** Leaflet is bundled (162 KB raw / ~46 KB gzipped). Tiles load on demand.
