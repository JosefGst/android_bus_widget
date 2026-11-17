# Glossary

Domain terms used in code, docs and reviews. Use these words, not synonyms.

**Route**: a KMB bus route, identified by its code (e.g. `272P`), direction (`bound`) and service type.

**Stop**: a KMB bus stop, identified by a Stop id. Several Stop ids can share one display name once the platform suffix is removed (e.g. "Causeway Bay (PA1)" and "Causeway Bay (PA2)" both display as "Causeway Bay").

**ETA**: one predicted arrival of a Route at a Stop, as returned by the KMB API. May have no time (shown as `--` or `-`). One ETA request for a Stop + Route can return both directions (`dir`) and, on a circular Route, both positions of the Stop (`seq`).

**Arrival**: an ETA as the user sees it at a given moment: Now, N min, or unknown. Buses more than a minute past their time have left and are dropped. Built by `arrivals()` in `utils/arrivals.ts`, the only place minutes are worked out.

**Favorite**: one `{route, service_type, stop}` triple the user follows. Two Favorites are the same when all three fields match. Owned by `utils/favorites.ts`. A Favorite covers every direction of the Route at that Stop: at a Stop both directions use, the Favorite board shows one row per direction, each with its destination. Adding a direction to Favorite was considered and rejected (Nov 2026): the board already keeps directions apart, and changing the stored format needs a migration.
_Avoid_: "favorite stop" (a Favorite is a Route at a Stop, not a Stop), "routes to fetch".

**Starter Favorites**: the Favorites a user gets before they have ever saved any. A user who removes every Favorite keeps an empty list; the starter set does not come back.

**Favorite board**: the user's Favorites with their live ETAs, grouped by Stop display name, Routes and arrivals sorted soonest first. Built by `loadFavoriteBoard()`; rendered by both the My Buses screen (next two arrivals per Route) and the widget (next arrival per Route).

**Language**: the one setting that picks English, Hong Kong Cantonese in Traditional characters (粵, `tc`; KMB names stay formal written Chinese) or Simplified Chinese (简, `sc`) for everything the user reads: screens, Route map labels and the widget. Follows the phone until the user picks one with the header button. Owned by `utils/language.ts`; the codes match the KMB API's field suffixes.
