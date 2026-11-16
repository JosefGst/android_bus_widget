# Senior-friendly redesign: plan

Mockups: the "Bus ETA Senior-Friendly Redesign" design canvas (five screens: My Buses, Find a Route, Route stop list, Route map, widget).

## Goal

Make the app easy to read and operate for older users. The answer to "when is my bus?" must be readable at arm's length, and every control must be large, labelled in words, and hard to trigger by accident.

## Design rules

These hold on every screen. `components/theme.ts` encodes them so screens do not repeat raw values.

- Body text at least 18px. Arrival minutes at 40–44px. Headings 30–34px.
- Every tap target at least 52px tall. Icon-only buttons get a text label beside the icon.
- Dark ink (`#14171F`) on a warm light background (`#F2F1EC`) with white cards. One accent blue (`#0A4FBF`). A bus that is due shows an amber "Now" label, not a colour alone.
- No debug text on screen. The "Generated Timestamp", direction and service-type codes go away. A plain "Updated 2:41 pm" replaces them.
- Place names in English are shown in title case ("Causeway Bay"), not the API's capitals.
- Every new label exists in English, Traditional Chinese and Simplified Chinese (`utils/strings.ts`).
- Display logic stays in `utils/` with unit tests. Screens only lay it out.

## Phases

Each phase ends green: `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run test:e2e`, plus a Playwright screenshot check on the web build. Each phase is one or more commits; tests come first.

### Phase 1. Foundation and My Buses

1. `utils/arrival_display.ts`. `arrivalTime(eta, now)` returns `{ kind: 'now' } | { kind: 'minutes', minutes } | { kind: 'unknown' }`. `routeRow(arrivals, now)` returns the next arrival plus the minutes of the one after it. Recomputed each second from the ETA times.
2. `utils/favorite_board.ts`. Each Route on the board carries its destination (`dest`), in the chosen language.
3. `utils/string_formatting.ts`. `displayPlaceName(name, language)` title-cases English names.
4. `utils/time_formatting.ts`. `formatClockTime(iso, language)` gives "2:41 pm" / "下午2:41" in Hong Kong time.
5. `components/theme.ts`. Colours, type sizes, spacing, radii.
6. `app/my_favorites.tsx` becomes **My Buses**. One card per Stop. Each Route row shows a route badge, "To <destination>", big minutes or "Now", and "then N min". The row opens Routes Stop as today. A Refresh button and "Updated <time>" replace the clock and timestamp. Removing moves behind a "Change my buses" button that shows a labelled Remove button on each row.
7. Tab label "My Favorites" becomes "My Buses".

### Phase 2. Find a Route

`app/index.tsx`. A large number field with Clear beside it. Result cards with the route badge and From / To on separate lines. The letters that can follow sit in one row above the number keys. The keypad's last row is a wide 0 and a labelled Delete key.

### Phase 3. Navigation

Two tabs, **My Buses** (first) and **Find a Route**, with 84px tab bar, 28px icons and 18px labels. Routes Stop leaves the tab bar and opens as a page from either tab, with a labelled Back button. This changes URLs, Maestro flows and e2e tests, so it is its own phase.

### Phase 4. Route screen

Header with the route badge and From / To in words. A "Stop list | Map" switch replaces the drag handle (`MapResizeHandle` and `utils/map_size.ts` go away). Tapping a Stop opens a card with the next two arrivals and a full-width **Save to My Buses** button that stays on the screen and changes to "Saved". The map buttons get text labels ("Where am I?", "Whole route").

### Phase 5. Widget

One row per Route with a white route badge, the Stop name and large minutes or "Now", plus "tap to update". Only `FlexWidget` / `TextWidget` features.

### Phase 6. Font

Atkinson Hyperlegible for Latin text via `@expo-google-fonts/atkinson-hyperlegible`. Chinese text keeps the system font.

## Out of scope

A text-size setting. Revisit after the larger defaults ship.

## Status

- Phase 1: done (commit on `josefgst/ui_design`). Unit + e2e green.
- Phase 2: done. Below a 720 px window height the keypad and title shrink so at least one result stays visible.
- Phase 3: done. `/` is My Buses (`app/index.tsx`), Find a Route moved to `/find_route`. Custom `BottomTabBar` with two tabs; Routes Stop stays a hidden route so tab history and Back keep working.
- Phase 4: done. Save keeps the user on Routes Stop. Reopening the same Route keeps the Stop that was open. Find a Route shows "Try again" when the Route list can't load.
- Honor tablet, Phase 4 build: 6 of 7 Maestro flows pass. `favorites` fails at start-up only: it clears app data, and the KMB CDN was refusing (403) the uncached Route list download after a day of test cold starts.
- Device run (Honor tablet, landscape) found stop names still in capitals on My Buses; fixed, with an uppercase mock Stop name in e2e.
- Known gap until Phase 4: the empty My Buses text says "tap Save", but Routes Stop still uses the star button.
