# Implementation Plan: GPS Blue Dot on Route Map

Source idea: [`docs/ideas/gps-blue-dot.md`](../docs/ideas/gps-blue-dot.md). Tasks are in [`tasks/todo.md`](todo.md).

## Overview
Show the user's own position as a blue dot with an accuracy circle on the Routes Stop map, Android only. A React Native "locate me" button over the map asks for permission, starts location updates and centers the map on the user once. Updates run only while the screen has focus and the map is shown. If permission is denied, the button is hidden and the map behaves as today.

## Architecture Decisions
- **React owns the location; the page only draws it.** `@react-native-community/geolocation` (Android `LocationManager` provider) runs in React, which sends a new `ToMapMessage` to the page: `{ type: 'setUserLocation', location: { lat, lng, accuracy } | null }`, plus `{ type: 'centerOnUser' }` when the button is tapped. The page stays a dumb view, as for markers and selection.
- **A pure `toUserLocation()` in `utils/route_stop_map.ts`** turns an `expo-location` reading into that location and returns `null` for invalid input (non-finite or out-of-range numbers). It is unit-tested.
- **Location logic lives in a hook in `components/`**, `useUserLocation(active)`, so `app/routes_stop.tsx` stays thin. It returns `{ permission: 'unknown' | 'granted' | 'denied', location, start() }`. It watches the position at balanced accuracy only while `active` is true (the screen has focus and the map is shown), and checks the permission again each time the screen gets focus, so a permission granted later in Android settings is picked up.
- **The Android host `components/StopMap.tsx`** takes new optional props `userLocation` and `centerOnUserToken`, a number that goes up on each "locate me" tap. It re-sends the last location on `ready`, like markers. `StopMap.web.tsx` ignores both props, so the shared `StopMapProps` type stays valid.
- **The map never follows the user automatically.** It centers only on a button tap.
- **The location is never stored or logged.**

- **Not `expo-location`:** it only uses Google Play Services' fused provider, so on devices without GMS (the Honor test tablet) no position ever arrives. Permissions use React Native's `PermissionsAndroid`; the manifest permissions come from `android.permissions` in `app.json`.

## Dependency Graph
```
geolocation lib + app.json permissions (native rebuild)
  └─ useUserLocation hook ─────────────┐
utils/route_stop_map.ts (types + toUserLocation) ─┐
  └─ stop_map_html.ts (draw dot / center) ─┐      │
       └─ StopMap.tsx (send, re-send on ready) ── app/routes_stop.tsx (button + wiring)
```

## Task List

### Phase 1: Foundation
- [x] Task 1: Message contract and `toUserLocation()` with unit tests
- [x] Task 2: The page draws the dot and accuracy circle and handles `centerOnUser`

### Checkpoint: Foundation
- [x] `npm test`, `npm run lint` and `npx tsc --noEmit` pass

### Phase 2: Android wiring (high risk: native module)
- [x] Task 3: Add `expo-location`, permissions and the `useUserLocation` hook
- [x] Task 4: StopMap host props and the locate-me button in Routes Stop

### Checkpoint: Device
- [x] Release APK builds; dot, centering, denial and blur behaviour verified on device

### Phase 3: Polish
- [x] Task 5: Documentation (AGENTS.md, GLOSSARY if needed) and a Maestro check that the button exists

### Checkpoint: Complete
- [ ] All acceptance criteria met, human review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| The location module needs a native rebuild; the dev client or CI APK job may break | High | Do Task 3 early and build the release APK right after |
| A jumping GPS reading makes the dot misleading | Med | Always draw the accuracy circle |
| Battery drain from watching location | Med | Watch only while focused and visible, balanced accuracy, `distanceInterval` of about 10 m |
| The dot is lost after the map is hidden and shown again | Med | Re-send the last location on `ready` |
| Web build breaks from importing the location module | Low | Use the hook only on Android (`Platform.OS` check), with Web as a no-op |
| Maestro can't fake GPS on the device | Low | Maestro only checks the button exists; the dot is checked by hand |

## Open Questions
- None blocking. The button's icon and position (for example the bottom-right corner of the map) can be decided in Task 4.
