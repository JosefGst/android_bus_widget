# Show Route Button on Route Map

## Problem Statement
How might we let the user get back to the whole Route in one tap after the map has moved away, for example after "Show my location"?

## Recommended Direction
Add a "Show route" button over the map, stacked above "Show my location" in the bottom-right corner. Tapping it sends a new `fitRoute` message, and the page calls its existing `fitAll()`. The message is triggered by a tap counter (`fitRouteToken`), the same way `centerOnUserToken` works, so the page never refits on its own. It's on both Android and Web: the button lives in `app/routes_stop.tsx`, and both map hosts pass the message on.

The selection is not changed: the selected Stop stays highlighted while the view zooms out to the whole Route. With only one Stop, `fitAll()` zooms to it at level 16.

## Key Assumptions to Validate
- [ ] Users understand the icon. Use `zoom-out-map` with the accessibility label "Show route", and check it on the tablet.
- [ ] Two stacked buttons don't cover markers or the attribution. Check at the small, ½ and large map sizes.

## MVP Scope
**In:**
- The `fitRoute` message type in `utils/route_stop_map.ts`.
- Handling it in `components/stop_map_html.ts` by calling `fitAll()`.
- The `fitRouteToken` prop in both `components/StopMap.tsx` and `components/StopMap.web.tsx`.
- The button in `app/routes_stop.tsx`, shown whenever there are markers.
- A Playwright test: pan the map away, tap the button, and the view fits the Route again.
- An `assertVisible` for the button in Maestro.

**Out:** everything below.

## Not Doing (and Why)
- **Toggle button:** you can't tell what the next tap will do.
- **Fitting the Route and your position together:** the Route gets tiny when you're far from it.
- **Zooming back to the selected Stop:** that's a different need; you can tap the Stop's row for it.
- **Auto-refitting when the location changes:** the map never moves on its own.

## Open Questions
- Icon: `zoom-out-map` (preferred, reads as "see everything") or `route`.
