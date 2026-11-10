# Glossary

Domain terms used in code, docs and reviews. Use these words, not synonyms.

**Route**: a KMB bus route, identified by its code (e.g. `272P`), direction (`bound`) and service type.

**Stop**: a KMB bus stop, identified by a Stop id. Several Stop ids can share one display name once the platform suffix is removed (e.g. "Causeway Bay (PA1)" and "Causeway Bay (PA2)" both display as "Causeway Bay").

**ETA**: one predicted arrival of a Route at a Stop, as returned by the KMB API. May have no time (shown as `--` or `-`).

**Favorite**: one `{route, service_type, stop}` triple the user follows. Two Favorites are the same when all three fields match. Owned by `utils/favorites.ts`.
_Avoid_: "favorite stop" (a Favorite is a Route at a Stop, not a Stop), "routes to fetch".

**Starter Favorites**: the Favorites a user gets before they have ever saved any. A user who removes every Favorite keeps an empty list; the starter set does not come back.

**Favorite board**: the user's Favorites with their live ETAs, grouped by Stop display name, Routes and arrivals sorted soonest first. Built by `loadFavoriteBoard()`; rendered by both the My Favorites screen (every arrival) and the widget (next arrival per Route).
