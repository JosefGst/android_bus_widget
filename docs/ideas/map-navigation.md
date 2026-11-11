# Map navigation without tab swipes + resizable Route map

> **Status: implemented.** Outcome differs from the plan below: toggling `swipeEnabled` from map touch
> messages raced the pager (map pans switched tabs in 3 of 4 device runs), so swipe navigation is now
> off on all tabs; tabs switch by tap. Map sizes are fractions of the area below the header, not the window.

## Problem Statement
How might we let users pan the Route map freely and resize it, while keeping tab swiping everywhere else?

## Recommended Direction
Turn off tab swiping only while a finger is on the map: the Leaflet page sends `touchstart`/`touchend`,
and `app/routes_stop.tsx` switches `swipeEnabled` on and off with `navigation.setOptions`. If that turns
out to be racy on a device (the first swipe still changes tabs), block the touch from reaching the pager
instead, at the native level.

Add a drag handle between the map and the Stop list that snaps to ⅓ / ½ / 85% of the screen. The chosen
size is saved in AsyncStorage through a small `utils/` module. After each resize, tell Leaflet its size
changed (`invalidateSize`) through a new `resize` message.

Tapping a marker grows the map one step (⅓ → ½) so the selected Stop gets more room. It never shrinks the
map, and does nothing if the map is already ½ or larger. The automatic grow is not saved; only sizes the
user drags to are.

## Key Assumptions to Validate
- [ ] The pager picks up `swipeEnabled` changes before it claims the gesture (try it on the device first)
- [ ] The handle's drag doesn't conflict with the Stop list's scrolling (the handle sits outside the ScrollView)
- [ ] Leaflet redraws correctly after a resize (no grey tiles)

## MVP Scope
In: no tab change when swiping on the map (Android); drag handle with 3 snap points; saved size; Leaflet
redraws after a resize; tapping a marker grows the map; Maestro flow.
Out: everything in "Not Doing".

## Not Doing (and Why)
- Bottom sheet over a full-screen map: rebuilds the whole screen for a small gain
- Free drag to any height: snap points are quicker and easier to hit
- Auto-resize while panning: jumpy and hard to predict
- Turning tab swiping off: the user swipes between tabs often
- Separate "pan mode" toggle: adds a tap every time

## Plan

Each task is small and can be checked on its own. Order matters where noted.

1. **Spike: does the gesture fix work?** (blocks 3)
   Temporarily turn `swipeEnabled` off from a WebView `touchstart` message and on again from `touchend`.
   Check on the device that panning the map no longer changes tabs. Record the result here; if it's racy,
   switch task 3 to the native fallback.
2. **Snap logic in `utils/map_size.ts`** + `map_size.test.ts`
   `SNAP_FRACTIONS = [1/3, 1/2, 0.85]`, `snapHeight(dragY, windowHeight)`, `growForMarker(current)`
   (⅓ → ½, otherwise unchanged), `loadMapSize()` / `saveMapSize()` (AsyncStorage, fallback ⅓).
3. **Gesture messages from the page** (after 1)
   `components/stop_map_html.ts`: post `touchStart`/`touchEnd` (and `touchcancel` → `touchEnd`).
   `utils/route_stop_map.ts`: add both to `parseFromMapMessage()` + tests.
   `StopMap` gets an `onTouchActiveChange(active)` prop; `routes_stop.tsx` sets `swipeEnabled`.
   Make sure swiping is always turned back on (on `touchEnd`, on blur, and when the map unmounts).
4. **`resize` message → `invalidateSize`**
   Add `resize` to the inbound messages; hosts send it when the height changes (Android + web).
5. **Drag handle** in `routes_stop.tsx` (or `components/MapResizeHandle.tsx`)
   Grip bar below the map; drag with PanResponder; snap with `snapHeight`; save the size on release;
   load it on mount. Hit area at least 44px; accessible label "Resize map".
6. **Marker tap grows the map**
   In `onMarkerPress`, apply `growForMarker` (not saved). Keep the existing scroll-to-Stop behaviour.
7. **Tests**
   Maestro flow: swipe on the map → still on Routes Stop; swipe on the list → tab changes; drag handle →
   map is taller and stays that way after reopening. Playwright (web): handle resizes the map and Leaflet
   redraws.
8. **Docs**
   Update `AGENTS.md` (map message types, `utils/map_size.ts`) and mark the assumptions above.
