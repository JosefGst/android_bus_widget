# Changelog

All notable changes to this project are documented in this file.

## [v1.1.0] - 2026-09-18

### Added
- On-screen keypad for entering a bus route number, arranged as a 3x4 numeric grid alongside a scrollable letter grid.
- Letter keypad only offers letters that can validly follow the digits typed so far (e.g. typing `272` offers `P`/`X` for routes `272P`/`272X`).
- Letters are also offered before any digits are typed, surfacing routes that start with a letter (e.g. `N` for `N29`).
- Playwright end-to-end tests for the keypad and route search, wired into CI.
- Unit tests for the extracted route-search logic (`utils/route_search.ts`).

### Changed
- Route search now matches by route-code prefix instead of a broad substring match across route/origin/destination, so typing a letter or digit reliably narrows to matching routes instead of also matching place names that happen to contain that letter.
- Refactored the route filtering and letter-suggestion logic out of the home screen into pure, testable utilities.
- Updated CI workflow and release keystore setup instructions in the README.

## [v1.0.2] - 2026-09-17

### Security
- Removed a release keystore that had been committed to the repository and added `*.keystore` to `.gitignore` to prevent secrets from being committed again.

## [v0.0.1] - 2026-09-17

Initial release.

### Added
- Home screen listing KMB bus routes with a search bar, backed by a daily-refreshing cache.
- Route stop screen showing live ETAs per stop, with countdown formatting and auto-refresh every 30 seconds.
- Favorites: add/remove favorite stops, persisted to storage, with a scrollable "My Favorites" list.
- Home screen widget (Android) showing grouped ETAs for favorited routes, resizable and updating on a schedule.
- Swipe navigation, redesigned back arrow, and fixed tab bar icon overlap with Android system buttons.
- Static web export of the app and app/web icons.
- Debug and release APK build support via a CI workflow, including Android SDK/keystore setup.
- Centralized JSON fetching, caching, and time/string formatting utilities, with initial unit test coverage.
