# GPS Blue Dot on Route Map

## Problem Statement
How might we show the user's own position on the Route map so they can see which Stops are near them?

## Recommended Direction
React gets the location with `expo-location` and sends `{ type: 'setUserLocation', lat, lng, accuracy }` to the Leaflet page. The page draws a blue dot and an accuracy circle, but only if the message is valid. Location updates run only while Routes Stop has focus and the map is visible, at balanced accuracy, and stop on blur. This keeps the page a dumb view, the same as for markers and selection.

A React Native "locate me" button sits on top of the map. Tapping it asks for permission, starts the location updates and centers the map on the user. The map never moves on its own after that, so it doesn't fight manual panning. The button lives in React Native rather than in the page because the permission request starts there anyway (no extra page→host message), and Maestro can tap it like any other control. If permission is denied, the button is hidden and the map behaves exactly as it does today.

## Key Assumptions to Validate
- [ ] GPS is accurate enough near Stops, which are often 100–300 m apart in HK while tall buildings make the position jump by 20–50 m. Test by walking a Route on the device and comparing the dot to the real Stops.
- [ ] Watching location while the screen has focus doesn't drain the battery noticeably. Check Android battery stats after about 30 minutes of use.
- [ ] The extra message doesn't break restoring the map after `ready`. The host must re-send the last position on `ready`, like it does for markers.

## MVP Scope
**In:**
- Android only, and only on the Routes Stop map.
- Add the `expo-location` dependency and the foreground location permission (`ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`) in `app.json`. This needs a native rebuild.
- Blue dot and accuracy circle, drawn in `components/stop_map_html.ts`.
- The new `setUserLocation` message type in `utils/route_stop_map.ts`, with unit tests for building and validating it.
- The React Native "locate me" button over the map. It is hidden when permission is denied.
- Location updates stop on blur and while the map is hidden. The last position is re-sent on `ready`.

**Out:** everything in the next section.

## Not Doing (and Why)
- **Web support:** not needed, and browser geolocation goes through a separate path.
- **The dot on My Favorites or other screens:** the map is the only place where it matters.
- **Background location or the widget:** needs Play policy review and has a big privacy cost.
- **Nearest-Stop highlight or list scrolling:** this is the next step, once the dot is proven trustworthy. It can reuse the existing `select` message.
- **Walk time vs. ETA:** needs routing or distance estimates; much later.
- **"Stops near me" screen:** a new product surface.
- **Storing or logging the location:** no use for it, only privacy risk.
- **Following the user automatically:** it fights manual panning.

## Open Questions
- After a denial, how does the user turn location back on? Android settings only, or check the permission again when the screen gets focus? Checking costs little, so it's probably worth doing.

## Update: precise GPS with fallback
GPS fixes are preferred; when there has been no GPS fix for 30 s (e.g. indoors) the Wi-Fi/cell position is shown. With only approximate permission, only Wi-Fi/cell is used. See `pickUserLocation()` in `utils/route_stop_map.ts`.
