# Todo: GPS Blue Dot on Route Map

See [`plan.md`](plan.md) for the design decisions.

## Task 1: Message contract and `toUserLocation()`

**Description:** Add the `UserLocation` type (`{ lat, lng, accuracy }`) and two new `ToMapMessage` variants, `setUserLocation` (location or `null`) and `centerOnUser`, to `utils/route_stop_map.ts`. Add a pure `toUserLocation(coords)` that returns `null` for non-finite or out-of-range values.

**Acceptance criteria:**
- [x] The types and messages are exported, with explicit return types
- [x] `toUserLocation` rejects NaN, Infinity, latitude outside ±90, longitude outside ±180 and a negative accuracy, and keeps valid input
- [x] Existing messages behave the same

**Verification:**
- [x] `npx jest utils/route_stop_map` passes, including new tests
- [x] `npx tsc --noEmit` passes

**Dependencies:** None
**Files:** `utils/route_stop_map.ts`, `utils/route_stop_map.test.ts`
**Scope:** S

## Task 2: The page draws the dot

**Description:** In `components/stop_map_html.ts`, handle `setUserLocation` by drawing or updating a blue `L.circleMarker` and an accuracy `L.circle`, or removing both when the location is `null`. Handle `centerOnUser` by panning to the dot without changing the zoom, unless the map is zoomed far out. The dot must not change the marker fit or selection.

**Acceptance criteria:**
- [x] The dot and circle appear, move and disappear as messages arrive
- [x] `setMarkers` and `fitAll` ignore the dot
- [x] `centerOnUser` with no location does nothing

**Verification:**
- [x] Manual: send the messages through `window.receive` in the Web build's iframe (devtools)
- [x] `npm run lint` passes

**Dependencies:** Task 1
**Files:** `components/stop_map_html.ts`
**Scope:** S

## Checkpoint: Foundation
- [x] `npm test`, `npm run lint` and `npx tsc --noEmit` pass

## Task 3: `expo-location`, permissions and the hook

**Description:** Install `expo-location` with `npx expo install`. Add the plugin and the `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` permissions to `app.json`, with no background permission. Create `components/use_user_location.ts`: `useUserLocation(active)` returns `{ permission, location, start }`. `start()` requests the permission. While `active` is true and the permission is granted, it watches the position (balanced accuracy, about 10 m `distanceInterval`) and maps readings through `toUserLocation`. The watch is removed when `active` is false or on unmount. The hook checks the permission again whenever `active` turns true. On Web it does nothing.

**Acceptance criteria:**
- [x] The release APK builds with the new module
- [x] The watch exists only while active, verified by the subscription being removed on blur
- [x] The location is never stored or logged

**Verification:**
- [x] `npx expo run:android --variant release` succeeds
- [x] `npm run web` still starts
- [x] `npm test` passes

**Dependencies:** Task 1
**Files:** `package.json`, `package-lock.json`, `app.json`, `components/use_user_location.ts`
**Scope:** M

## Task 4: Host props and the locate-me button

**Description:** Add optional `userLocation` and `centerOnUserToken` to `StopMapProps`. `StopMap.tsx` sends `setUserLocation` on change and on `ready`, and `centerOnUser` when the token goes up. `StopMap.web.tsx` ignores both. In `app/routes_stop.tsx`, call `useUserLocation(isFocused && mapShown)` and show a "locate me" button over the map corner, with the accessibility label `"Show my location"`, unless the permission is denied. Tapping it calls `start()` and increments the token.

**Acceptance criteria:**
- [ ] The first tap asks for permission. After a grant the dot appears and the map centers on it
- [ ] After a denial the button is hidden, and the map, markers and selection work as before
- [ ] Switching tabs stops location updates; coming back resumes them, and the dot survives hiding and showing the map

**Verification:**
- [ ] `npx tsc --noEmit`, `npm run lint` and `npm test` pass
- [ ] Manual on device: grant, deny, re-grant in settings then refocus, tab switch, hide and show the map

**Dependencies:** Tasks 2 and 3
**Files:** `components/stop_map_html.ts` (props type), `components/StopMap.tsx`, `components/StopMap.web.tsx`, `app/routes_stop.tsx`
**Scope:** M

## Checkpoint: Device
- [ ] Release APK installed; all Task 4 manual checks pass
- [ ] Existing Maestro flows still pass (`npm run test:maestro`)
- [ ] Human review before continuing

## Task 5: Docs and Maestro

**Description:** Update the AGENTS.md map notes (the new messages, the hook, location never stored, Android only). Add a short Maestro flow that the "Show my location" button is visible on Routes Stop. It must not tap the button: the permission dialog differs between ROMs.

**Acceptance criteria:**
- [ ] AGENTS.md describes the feature and its constraints
- [ ] The new Maestro flow passes on the device

**Verification:**
- [ ] `maestro test .maestro/<new_flow>.yaml` passes

**Dependencies:** Task 4
**Files:** `AGENTS.md`, `.maestro/route_map_location.yaml`
**Scope:** S

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review
