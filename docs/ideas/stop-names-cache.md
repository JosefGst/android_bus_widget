# Stop names without repeat downloads

**Status:** Direction A implemented (2026-11-11) in `utils/stops.ts` (`getStopsFor`). Direction B (only single-Stop requests) is the planned next step if A is not enough.

## Problem Statement

How might we always show Stop names on Routes Stop for non-technical users (friends and family), while downloading the 1 MB `/stop` list about once per install, even when the KMB CDN randomly answers 403?

### Why this matters

- `getCachedStops()` downloads the full list again when the cache is more than 24 hours old. A failed download is not saved, so every Route opened downloads the 1 MB list again until one succeeds. These bursts likely trigger the CDN's 403s.
- When the download fails, Routes Stop swallows the error. The rows show Stop IDs and the map says "Map unavailable". Nothing retries.
- Routes Stop needs names and coordinates for about 30 Stops, not the full list of 6,000+. `/stop/{id}` returns both.

## Recommended Direction

**A. Bulk list once, then fill gaps.**

The cached Stop list never expires. `getCachedStops()` downloads `/stop` only when there is no cache at all. After loading a Route, Routes Stop checks which of its Stop IDs are not in the cache, fetches only those with `/stop/{id}` (limited concurrency), and adds them to the cache. A failed bulk download no longer means IDs on screen, because filling the gaps covers the Route being viewed. Without a cache, the bulk download is only tried again when filling gaps also saved nothing (network down or fully blocked), so it can't cause bursts. A per-session limit was dropped as unnecessary.

The logic lives in `utils/`, so Jest can test it. The screen just asks for "Stops for these IDs". If the bulk download and the single-Stop requests both fail, the screen shows a small "Couldn't load stop names — Retry" row. That is the only manual refresh, and it only appears when needed.

Rejected: an always-visible "Refresh stops" button. Friends and family won't know that pressing it fixes Stop IDs, and filling gaps makes it unnecessary.

### Alternatives considered

| | A. Bulk list once, then fill gaps | B. Single Stops only | C. Ship the list in the APK, then fill gaps |
|---|---|---|---|
| Bulk downloads | About 1 per install | 0 | 0 |
| First view of a Route | Instant, or ~30 small requests if the bulk download failed | ~30 small requests | Instant |
| Cost | Small | Medium | Medium (generator script, +1 MB APK) |
| Risk | Low | 30 requests at once could trip a rate limit too | List goes stale between releases |

## Key Assumptions to Validate

- [ ] `/stop/{id}` is not blocked like the bulk list. Test: send ~30 parallel curl requests a few times and count the 403s.
- [ ] Stop renames are rare. Filling gaps catches new IDs, not renamed Stops. Test: compare the cached list with a fresh download after a few weeks.
- [ ] Single-Stop requests with limited concurrency (4 at a time) load a Route's ~30 Stops in under 2 seconds on the tablet.

## MVP Scope

**In:**
- A new `utils/stops.ts` helper, `getStopsFor(stopIds)`, replaces `getCachedStops()`. The cache never expires. The full list is downloaded only when there is no cache, and only a response with a `data` array is saved. Missing Stops are fetched with `/stop/{id}` (max 4 parallel), and records without `stop` and `name_en` are rejected (KMB answers unknown IDs with `data: {}`).
- Routes Stop uses the helper for both Stop names and map markers.
- A Retry row on Routes Stop, shown only when some Stop names are still missing.
- Jest tests for the helper and the new cache rules.
- The Maestro `route_stop_map` flow checks that Stop names are shown.

**Out:** everything under "Not Doing".

## Not Doing (and Why)

- **A permanent "Refresh stops" button.** Family users won't press it, and filling gaps makes it unnecessary.
- **A periodic background refresh.** Stops hardly change, and it brings back the bulk traffic.
- **Changing the Routes cache on Home.** Kept out of scope on purpose. It has the same problem, so it's a likely follow-up.
- **Having the Favorite board reuse the Stop cache.** It's a separate change: it touches the widget's background context.
- **Shipping the list in the APK.** It adds a build step to save one download per install.
- **Detecting renamed Stops.** It's rare, and we'd only handle it if the rename assumption turns out wrong.

## Open Questions

- If the bulk download fails on a fresh install, the cache starts out holding only Stops filled in one at a time. Its presence then stops any later bulk download, so the app behaves like direction B. This is accepted for the MVP.
- Should the parsed Stop list stay in memory so the ~1 MB isn't read and parsed from AsyncStorage on every Route open? Not part of the MVP.
