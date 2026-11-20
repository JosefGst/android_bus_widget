# Glossary

Domain terms used in code, docs and reviews. Use these words, not synonyms.

**Route**: a KMB bus route, identified by its code (e.g. `272P`), direction (`bound`) and service type.

**Stop**: a KMB bus stop, identified by a Stop id. Several Stop ids can share one display name once the platform suffix is removed (e.g. "Causeway Bay (PA1)" and "Causeway Bay (PA2)" both display as "Causeway Bay").

**ETA**: one predicted arrival of a Route at a Stop, as returned by the KMB API. May have no time (shown as `--` or `-`). One ETA request for a Stop + Route can return both directions (`dir`) and, on a circular Route, both positions of the Stop (`seq`).

**Arrival**: an ETA as the user sees it at a given moment: Now, N min, or unknown. Buses more than a minute past their time have left and are dropped. Built by `arrivals()` in `utils/arrivals.ts`, the only place minutes are worked out. (The Favorite board stores plain ETA times, `BoardEta`; they become Arrivals only when shown.)

**Stop name**: a Stop's name as the user reads it: in the chosen Language, platform suffix removed, English in title case. Built by `stopDisplayName()` in `utils/string_formatting.ts` and used everywhere a Stop is named: the Favorite board (so My Buses and the widget show it as given), the Route page's Stop list and the Route map's markers. Stops come from `getStopsFor()`, never from `fetchStop` directly.

**Favorite**: one Route the user follows at one Stop, optionally in one direction. A Favorite saved from a Route page has that page's direction (its `bound`) and the Favorite board shows only that direction. A Favorite without a direction is a legacy one, from before directions were kept: it covers every direction of the Route at that Stop, and at a Stop both directions use, the board shows one row per direction, each with its destination. Two Favorites are the same when route, service type, Stop and direction (or the lack of one) all match, so the two directions of a Route at one Stop are two Favorites, and a legacy Favorite is separate from a directed one. A Route page counts a Stop as saved when a Favorite with that direction exists or a legacy Favorite covers it. Owned by `utils/favorites.ts`.
_Avoid_: "favorite stop" (a Favorite is a Route at a Stop, not a Stop), "routes to fetch".

**Starter Favorites**: the Favorites a user gets before they have ever saved any. A user who removes every Favorite keeps an empty list; the starter set does not come back.

**Favorite board**: the user's Favorites with their live ETAs, grouped by Stop display name, Routes and arrivals sorted soonest first. Built by `loadFavoriteBoard()`; rendered by both the My Buses screen (next two arrivals per Route) and the widget (next arrival per Route).

**Language**: the one setting that picks English, Hong Kong Cantonese in Traditional characters (粵, `tc`; KMB names stay formal written Chinese) or Simplified Chinese (简, `sc`) for everything the user reads: screens, Route map labels and the widget. Follows the phone until the user picks one with the header button. Owned by `utils/language.ts`; the codes match the KMB API's field suffixes.

**Fare**: the adult Octopus price to ride a Route from a given Stop to its terminus. It can differ from Stop to Stop on a Route that has section fares. Not shown for the terminus, nor for a Route with no fare data. Looked up by the Stop's position on the Route (`seq`), so a circular Route's two visits to one Stop can have different Fares.
_Avoid_: "price", "ticket".

**Route page session**: the state of an open Routes Stop page: its Route, the Route's Stops, the selected Stop (a position on the Route, `seq`) and that Stop's ETAs. Owned by `utils/route_stop_session.ts`; the screen sends events (open, focus, blur, select) and renders the state.
