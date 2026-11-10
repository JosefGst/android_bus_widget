# Implementation Plan: Routes Stop map

Source spec: [`SPEC-routes-stop-map.md`](../SPEC-routes-stop-map.md). Tasks are in [`tasks/todo.md`](todo.md).

## Overview

Add a Leaflet map (HK Lands Department tiles) above the stop list on the Routes Stop screen:
- One numbered marker per Stop.
- Tapping a marker selects the Stop: the map zooms and highlights it, and the list scrolls to the row and expands it.
- Tapping a row selects the Stop the same way.
- The map can be collapsed.
- The same HTML page runs in `react-native-webview` on Android and in an `<iframe srcDoc>` on Web.

**Order:**
1. Pure logic, with tests.
2. The bundled Leaflet assets.
3. **The riskiest step:** a working map on both platforms. A WebView on Android plus an iframe on Web is where things are most likely to break, so it gets proven before any interaction is built.
4. Selection.
5. Collapse.
6. E2E test and docs.

## Architecture decisions

- **One selected Stop.** The existing `expandedStop` state in `routes_stop.tsx` becomes the selection. A single `selectStop(stopId | null)` function handles row taps and marker taps. It expands the row, fetches ETAs if needed (the existing logic moves here), and scrolls the list. The map gets `selectedStop` as a prop and reacts to changes, so the list and map can't get out of sync.
- **The map is a dumb view.** The HTML page only renders what it's told (`setMarkers`, `select`) and reports `ready` / `markerPress`. All decisions stay in React.
- **One HTML string, two hosts.** `buildMapHtml()` runs once at module level, because the inlined Leaflet code is about 160 KB. `StopMap.tsx` (Android) and `StopMap.web.tsx` (Web) only handle messages:
  - Android: `injectJavaScript` / `onMessage`, with `window.ReactNativeWebView.postMessage` on the page side.
  - Web: `iframe.contentWindow.postMessage` / `window` `message` events.
  - The page listens on both `window` and `document`, since Android WebView sends messages to `document`.
- **Messages are queued until `ready`.** The host keeps the latest markers and selection and sends them when the page says `ready`. The same thing happens after a remount (for example when the map is re-shown), which is how B6 works without extra code.
- **Collapse unmounts the map.** Re-showing it mounts a fresh page, which receives the current markers and selection on `ready`. This is simpler than keeping a hidden WebView alive and avoids layout bugs from zero height.
- **Leaflet assets are generated and committed.** `scripts/gen_leaflet_assets.js` turns `node_modules/leaflet/dist/leaflet.{js,css}` into `components/generated/leaflet_assets.ts`. ESLint ignores `components/generated/`.
- **`components/` is a new top-level folder.** Dependencies point one way: `app/` → `components/` → `utils/`.

## Dependency graph

```
utils/route_stop_map.ts (RouteMarker, buildRouteMarkers, parseFromMapMessage)   [T1, T2]
components/generated/leaflet_assets.ts  ← scripts/gen_leaflet_assets.js          [T3]
        │
        ▼
components/stop_map_html.ts (buildMapHtml)                                       [T4]
        │
        ├── components/StopMap.tsx      (react-native-webview)                   [T4]
        └── components/StopMap.web.tsx  (iframe srcDoc)                          [T4]
                │
                ▼
app/routes_stop.tsx: map shown (T4) → selectStop sync (T5) → collapse (T6)
                │
                ▼
e2e/route-stop-map.spec.ts (T7), AGENTS.md (T8)
```

T1, T2 and T3 don't depend on each other and could be done in any order or at the same time. Everything from T4 on is sequential.

## Task list

### Phase 1: Foundation
- [ ] T1: `buildRouteMarkers()`, with tests (S)
- [ ] T2: Map message types and `parseFromMapMessage()`, with tests (S)
- [ ] T3: Bundle Leaflet with a generator script (S)

### Checkpoint A: Foundation
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` pass

### Phase 2: Map on screen (highest risk)
- [ ] T4: Static map with fitted markers on Web and Android (M)

### Checkpoint B: Map renders on both platforms (human check on device)
- [ ] Web: markers and tiles visible, view fitted to the Route
- [ ] Android: same, and pinch and pan work in the WebView

### Phase 3: Interaction
- [ ] T5: Shared selection between markers and rows (M)
- [ ] T6: Collapse and show the map (S)

### Checkpoint C: Feature complete (human check on device)
- [ ] Spec behaviours B1–B9 work on Android and Web

### Phase 4: Hardening
- [ ] T7: E2E test for the map flow (M)
- [ ] T8: Docs: AGENTS.md and the spec status (XS)

### Checkpoint D: Done
- [ ] All spec success criteria 1–7 met; ready for PR

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Android WebView and iframe deliver `postMessage` differently | High | T4 proves the `ready` round trip on both platforms before any interaction is built. The page listens on both `window` and `document`. |
| Messages sent before Leaflet is ready are lost | Med | The host queues the latest state and sends it on `ready`. |
| `FlatList.scrollToIndex` fails for rows that aren't rendered yet or have changing heights (expanded rows) | Med | Handle `onScrollToIndexFailed`: jump to the estimated position (`scrollToOffset`), then retry `scrollToIndex` after one frame. |
| A 160 KB HTML string is rebuilt on every render | Low | Build it once at module level and pass the same `source` / `srcDoc` value every time. |
| Web static export: the iframe is rendered on the server | Low | Render the iframe only after mount (the screen already sets client state in effects). |
| The map makes the existing Web hydration error (#418) worse | Low | The map renders nothing on the server. Check during Checkpoint B. |
| The E2E mock Stops have no coordinates | Low | T7 adds `lat`/`long` to `e2e/mocks.ts`. The existing tests ignore those fields. |
| `react-native-webview` needs a native rebuild | Low | Rebuild with `npx expo run:android` at Checkpoint B. The CI APK build picks it up automatically. |

## Open questions

- None that block the work. Reviewing the Lands Department terms only matters if the app is ever published.
