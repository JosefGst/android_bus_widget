# Tasks: Routes Stop map

See `tasks/plan.md` for the decisions and risks, and `SPEC-routes-stop-map.md` for behaviours B1–B9. Logic tasks follow red, green, refactor: write a failing test first.

**Standard checks**, run after every task:
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`

---

## Phase 1: Foundation

### T1: `buildRouteMarkers()`, with tests (S)
**Description:** New `utils/route_stop_map.ts` with the `RouteMarker` type and `buildRouteMarkers(routeStops: ROUTS[], stops: Stop[]): RouteMarker[]`. It joins the Route's Stops with the cached Stop data and turns the coordinates into numbers.

**Acceptance criteria:**
- [ ] Markers are sorted by `seq` (a number) and carry `stop`, `seq`, `name`, `lat`, `lng`.
- [ ] A Stop gets no marker if it isn't in the cache, if its `lat`/`long` is missing, empty or not a number, or if it lies outside HK (lat 22.1–22.6, lng 113.8–114.5).
- [ ] The name falls back to the Stop id when `name_en` is missing.

**Verification:** `npm test -- route_stop_map`, plus the standard checks.
**Dependencies:** None
**Files:** `utils/route_stop_map.ts`, `utils/route_stop_map.test.ts`

### T2: Map message types and `parseFromMapMessage()`, with tests (S)
**Description:** Add the `ToMapMessage` and `FromMapMessage` types (spec protocol) and `parseFromMapMessage(raw: unknown): FromMapMessage | null` to `utils/route_stop_map.ts`. Messages from the map are untrusted, so this function validates them.

**Acceptance criteria:**
- [ ] It accepts a JSON string of `{type:'ready'}` or `{type:'markerPress', stop:'<string>'}`.
- [ ] It returns `null` for anything else: input that isn't a string, bad JSON, unknown `type`, or a `stop` that is missing, empty or not a string.

**Verification:** `npm test -- route_stop_map`, plus the standard checks.
**Dependencies:** None (same file as T1; do them one after the other)
**Files:** `utils/route_stop_map.ts`, `utils/route_stop_map.test.ts`

### T3: Bundle Leaflet with a generator script (S)
**Description:**
- Add `leaflet@1.9.4` as an exact devDependency.
- Write `scripts/gen_leaflet_assets.js`. It reads `node_modules/leaflet/dist/leaflet.js` and `leaflet.css` and writes `components/generated/leaflet_assets.ts`, which exports `LEAFLET_JS` and `LEAFLET_CSS` with a "GENERATED — do not edit" header.
- Run it and commit the output.
- Make ESLint ignore `components/generated/`.

**Acceptance criteria:**
- [ ] `node scripts/gen_leaflet_assets.js` regenerates the same file every time.
- [ ] `npx tsc --noEmit` and `npm run lint` pass with the generated file present.

**Verification:** run the script twice and check `git diff --stat` shows no change; standard checks.
**Dependencies:** None
**Files:** `package.json`, `package-lock.json`, `scripts/gen_leaflet_assets.js`, `components/generated/leaflet_assets.ts`, `eslint.config.js`

### Checkpoint A: Foundation
- [ ] Standard checks pass
- [ ] `utils/route_stop_map.ts` has no React or `components/` imports

---

## Phase 2: Map on screen (highest risk)

### T4: Static map with fitted markers on Web and Android (M)
**Description:**
- `components/stop_map_html.ts` builds the page once at module level. The page contains:
  - the inlined Leaflet code
  - the basemap and label tile layers
  - the Lands Department attribution
  - numbered circle markers (`L.divIcon` styled like the list's `seqCircle`)
  - a `setMarkers` handler that fits the view to all markers
  - a `ready` message sent to the app
- `StopMap.tsx` (Android) shows the page in `react-native-webview` (`npx expo install react-native-webview`).
- `StopMap.web.tsx` (Web) shows it in an `<iframe srcDoc>`, rendered only after mount.
- Both hosts queue the latest markers and send them on `ready`.
- `routes_stop.tsx` keeps the full `Stop` data from `getCachedStops()` (not just names) and builds the markers with `buildRouteMarkers`. It renders `StopMap` between the header and the list at about ⅓ of the window height, or a "Map unavailable" placeholder when there are no markers (B8).
- This task only shows the map: no selection yet.

**Acceptance criteria:**
- [ ] B1: opening a Route shows numbered markers fitted to the view, with tiles and attribution visible, on Web.
- [ ] B8: if the Stop cache fails or there are no coordinates, "Map unavailable" shows and the list still works.
- [ ] Incoming messages go through `parseFromMapMessage`.

**Verification:**
- Standard checks.
- `npm run web`: open Route 272P outbound and confirm markers and tiles appear.
- `npx expo run:android` on a device: the same, plus pinch and pan work.

**Dependencies:** T1, T2, T3
**Files:** `components/stop_map_html.ts`, `components/StopMap.tsx`, `components/StopMap.web.tsx`, `app/routes_stop.tsx`, `package.json`

### Checkpoint B: Map renders on both platforms
- [ ] Web and Android both show the fitted markers and the tiles
- [ ] Pinch and pan work in the Android WebView
- [ ] No new console errors on Web, apart from the existing #418
- [ ] **Human review before continuing**

---

## Phase 3: Interaction

### T5: Shared selection between markers and rows (M)
**Description:**
- Pull the row's tap logic out into `selectStop(stopId: string | null)` in `routes_stop.tsx`. It sets `expandedStop`, fetches ETAs if they're not loaded yet, and scrolls the list to the row with `scrollToIndex`. If that fails (`onScrollToIndexFailed`), it jumps to an estimated offset and retries after one frame.
- A row tap calls `selectStop`, or `selectStop(null)` when the row is already expanded.
- `StopMap` gets `selectedStop` and `onMarkerPress` props. A marker tap calls `selectStop`.
- The page handles `select`:
  - for a Stop: `setView(latlng, 17)`, highlight the marker (contrasting colour, larger, drawn on top)
  - for `null`: remove the highlight without moving the map
- Both hosts send the latest `selectedStop` on `ready` and whenever it changes.

**Acceptance criteria:**
- [ ] B2: a marker tap zooms and highlights the Stop, and the list scrolls to its row and expands it with ETAs.
- [ ] B3 and B4: a row tap highlights and zooms to its marker. Tapping the expanded row again clears the highlight.
- [ ] B7: selecting a Stop that has no marker expands the row and leaves the map where it is.

**Verification:** standard checks. Manual on Web and Android: tap the marker of a Stop far down the list and confirm the list scrolls to it and expands it. Tap rows and confirm the map follows.
**Dependencies:** T4
**Files:** `app/routes_stop.tsx`, `components/stop_map_html.ts`, `components/StopMap.tsx`, `components/StopMap.web.tsx`

### T6: Collapse and show the map (S)
**Description:**
- Add a `mapVisible` state (starts `true`, not saved between visits) and a toggle button at the map's edge (MaterialIcons, with an `accessibilityLabel` of "Hide map" or "Show map").
- Collapsing unmounts `StopMap`. Showing it again mounts a fresh page, which receives the current markers and selection on `ready`.

**Acceptance criteria:**
- [ ] B5: collapsing hides the map and the list fills the space.
- [ ] B6: showing the map again restores it, zoomed on the selected Stop, or fitted to the Route if nothing is selected.

**Verification:** standard checks. Manual on Web and Android: select a Stop, collapse, show again, and confirm the selected Stop is still highlighted.
**Dependencies:** T5
**Files:** `app/routes_stop.tsx`

### Checkpoint C: Feature complete
- [ ] B1–B9 checked on Android and Web (B9: in airplane mode the list and its already-loaded ETAs still work)
- [ ] **Human review before continuing**

---

## Phase 4: Hardening

### T7: E2E test for the map flow (M)
**Description:**
- Add `lat`/`long` (inside HK) to the mocked Stops in `e2e/mocks.ts`. Mock a Route with at least 3 Stops if needed.
- Route `mapapi.geodata.gov.hk` tile requests to a 1×1 PNG.
- `e2e/route-stop-map.spec.ts` uses `page.frameLocator` to test four things:
  - the markers render
  - clicking a marker expands its row
  - clicking a row adds the highlight class to its marker
  - Hide/Show map works

**Acceptance criteria:**
- [ ] `npm run test:e2e` passes, including the existing specs, without real network access to KMB or the tile servers.

**Verification:** `npm run test:e2e`; standard checks.
**Dependencies:** T6
**Files:** `e2e/mocks.ts`, `e2e/route-stop-map.spec.ts`

### T8: Docs: AGENTS.md and the spec status (XS)
**Description:**
- AGENTS.md:
  - add `components/` (and the generated Leaflet file and its script) to the Structure section and the dependency graph
  - add a "Change the map" row to WHERE TO LOOK
  - add `react-native-webview` to Key Integration Points
  - add an anti-pattern: never hand-edit `components/generated/`
- Mark the spec as Implemented.

**Acceptance criteria:**
- [ ] AGENTS.md matches the code, and the dependency rule `app/ → components/ → utils/` is written down.

**Verification:** read-through.
**Dependencies:** T7
**Files:** `AGENTS.md`, `SPEC-routes-stop-map.md`

### Checkpoint D: Done
- [ ] Spec success criteria 1–7 met
- [ ] Standard checks and `npm run test:e2e` pass
- [ ] Ready for PR
