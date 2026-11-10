# AGENTS.md — Bus ETA App

**Generated:** 2026-02-27 | **Commit:** ddaacdb | **Branch:** main

Expo React Native app (React 19, RN 0.81) targeting Android + Web. Displays KMB bus arrival times with an Android home-screen widget.

---

## Structure

```
index.ts                  # App entry — registers widget handler BEFORE expo-router
widget-registration.ts    # Android widget handler registration (conditional on Platform.OS)
app/                      # Expo Router screens (tab-based)
  _layout.tsx             # Tab layout: Home, Routes Stop, My Favorites
  index.tsx               # Route browser with search
  routes_stop.tsx         # Stop list for a route + ETA + favorite button
  my_favorites.tsx         # Saved favorites with real-time ETA countdown
utils/                    # Shared utilities (NOT inside app/)
  fetch.ts                # KMB API calls, types, 24h AsyncStorage cache
  favorites.ts            # Favorites: the only reader/writer of the Favorite list (list/add/remove/listForWidget/onFavoritesChanged)
  favorite_board.ts       # loadFavoriteBoard(): Favorites → ETAs grouped by Stop — shared by widget/ and app/my_favorites.tsx
  string_formatting.ts    # normalizeStopName()
  time_formatting.ts      # formatEtaToHKTime(), getMinutesUntilArrival()
  *.test.ts               # Jest unit tests, colocated with the module they cover
widget/                   # Android widget (background task context) → see widget/AGENTS.md
  BusETAWidget.tsx         # Widget UI renderer
  widget-task-handler.tsx  # Widget lifecycle events + renderBusWidget()
  refresh_widget.tsx       # refreshBusWidget(): immediate re-render after a Favorites change
  HelloWidget.tsx          # Example widget (unused)
app-example/              # Expo scaffold — reference only, do not modify
assets/                   # Images, icons
android/ ios/             # Native platform files
```

---

## Commands

```bash
npm install                                      # Install deps
npx expo start                                   # Dev server
npx expo run:android                             # Run on Android
npm run web                                      # Run on Web
npm run lint                                     # ESLint (expo flat config)
npx expo run:android --variant release           # Build release APK
adb install -r android/app/build/outputs/apk/release/app-release.apk  # Install APK
npm test                                         # Run Jest unit tests
npm run test:watch                               # Jest in watch mode
```

**Tests:** Jest (`jest-expo` preset). Unit tests cover `utils/*` — pure logic and AsyncStorage/network-backed functions — colocated as `*.test.ts` next to the module they test. Widget rendering (`FlexWidget`/`TextWidget` trees) and screen components are not covered; keep business logic in `utils/` (not inline in components/handlers) so it stays unit-testable. Mocking conventions: `@react-native-async-storage/async-storage` is mocked globally via `jest.setup.js` (official `.../jest/async-storage-mock`); global `fetch` is mocked per-test with `jest.spyOn(global, 'fetch')`. CI runs `npm test` on every push and gates the APK build job on it (`.github/workflows/ci.yml`).

---

## Architecture & Data Flow

```
index.ts
  ├─ widget-registration.ts  →  widget/widget-task-handler.tsx  →  widget/BusETAWidget.tsx
  │     │                              └─ utils/favorites (listForWidget), utils/favorite_board
  │     └─ onFavoritesChanged → widget/refresh_widget.tsx (Android only)
  └─ expo-router/entry
      └─ app/_layout.tsx (3 tabs)
          ├─ app/index.tsx          → utils/fetch, utils/time_formatting
          ├─ app/routes_stop.tsx    → utils/fetch, utils/favorites, utils/time_formatting
          └─ app/my_favorites.tsx   → utils/favorites, utils/favorite_board, utils/time_formatting
```

- **No circular dependencies.** Dependency direction: `app/` and `widget/` → `utils/`. Never import from `app/` into `utils/` or `widget/`.
- **API:** KMB public API (`data.etabus.gov.hk`). All fetch logic in `utils/fetch.ts`. Use `fetchJson<T>()` for all API calls — never call `fetch()` directly.
- **Caching:** `getCachedRoutes()` / `getCachedStops()` — 24h AsyncStorage cache with `isCacheStale()` check.
- **Favorites:** `utils/favorites.ts` is the only module that reads or writes the Favorite list. Writes are serialized internally; screens must not keep their own copies or queues. Never pass Favorite data through navigation params.
- **Favorite board:** `loadFavoriteBoard()` is the single ETA pipeline for both My Favorites and the widget. It rejects only when every ETA request fails, so callers keep their last board.
- **Widget:** Runs as Android background task. See `widget/AGENTS.md` for critical constraints.

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a new tab screen | `app/` + `app/_layout.tsx` | Create file, register in Tabs |
| Add/modify API calls | `utils/fetch.ts` | Use `fetchJson<T>()` helper |
| Change ETA formatting | `utils/time_formatting.ts` | `formatEtaToHKTime`, `getMinutesUntilArrival` |
| Modify Favorite logic or starter Favorites | `utils/favorites.ts` | `add`/`remove`/`list`, `STARTER_FAVORITES`; storage key must not change |
| Change ETA grouping/ordering | `utils/favorite_board.ts` | `loadFavoriteBoard` — used by `app/my_favorites.tsx` and `widget/widget-task-handler.tsx` |
| React to Favorites changes | `utils/favorites.ts` | `onFavoritesChanged(listener)` |
| Widget UI/data | `widget/` | See `widget/AGENTS.md` — different execution context |
| Expo/widget config | `app.json` | Widget names must match code exactly |
| React Compiler exclusion | `babel.config.js` | Widget files excluded from compiler |
| Theming reference | `app-example/constants/theme.ts` | Reference only — do not import in production code |

---

## Code Style

### Language & Typing
- **TypeScript only.** `strict: true` enforced.
- **NEVER** use `as any`, `@ts-ignore`, `@ts-expect-error`.
- `type` for object shapes. `interface` for component props.
- Explicit return types on exported functions.
- Path alias `@/*` maps to project root (prefer relative imports in this project).

### Naming
- **Files:** `snake_case` for screens/utils. `PascalCase` for widget components.
- **Components:** `PascalCase`. **Functions/variables:** `camelCase`.
- **Types:** `PascalCase` (`ETA`, `Stop`, `ROUTS`, `KMBResponse<T>`).
- **Constants:** `SCREAMING_SNAKE_CASE` (`FAVORITE_STOP_KEY`, `ROUTE_CACHE_KEY`).

### Imports
- External packages first, then internal (`@/` or relative).
- Named imports preferred. Default exports for screen components.
- **Widget files must `import React from "react"` explicitly** — no JSX transform.

### Error Handling
- Wrap async API calls in `try/catch`. Log with `console.error()`.
- Return safe fallbacks: `[]`, `null`, or `false`.
- Use `fetchJson<T>()` — never raw `fetch()`.
- Error variable name: `e`.

### State & Effects
- `useCallback` for functions in `useEffect` deps.
- Serialize AsyncStorage writes with ref-based promise queue.
- Auto-refresh intervals must clean up via `clearInterval` in useEffect return.
- Accurate dependency arrays — never omit reactive values.

### Formatting
- Single quotes (JS/TS), double quotes (JSON).
- 2-space indentation. Trailing commas. No semicolons.

---

## Anti-Patterns (THIS PROJECT)

- **NEVER** suppress types with `as any`, `@ts-ignore`, `@ts-expect-error`.
- **NEVER** call `fetch()` directly — use `fetchJson<T>()` from `utils/fetch.ts`.
- **NEVER** import from `app/` into `utils/` or `widget/` (breaks dependency graph).
- **NEVER** use React hooks in `widget/` files — they run outside React lifecycle.
- **NEVER** modify `app-example/` — reference only.
- **Widget names** in code must exactly match `app.json` plugin config (`"BusETAWidget"`).
- Do not hardcode debug/telemetry URLs (known violations in `routes_stop.tsx`).

---

## Key Integration Points

| Concern | Location |
|---------|----------|
| Entry point ordering | `index.ts` — widget registration BEFORE expo-router |
| Tab navigation | `app/_layout.tsx` |
| KMB API + caching | `utils/fetch.ts` |
| Favorite persistence | `utils/favorites.ts` |
| Favorite board (ETAs by Stop) | `utils/favorite_board.ts` |
| Widget UI | `widget/BusETAWidget.tsx` |
| Widget data handler | `widget/widget-task-handler.tsx` |
| Widget config | `app.json` (`react-native-android-widget` plugin) |
| React Compiler exclusion | `babel.config.js` (sources filter) |
| EAS Build profiles | `eas.json` (dev/preview/production) |

---

## Notes

- `app/(tabs)/` exists but is empty — tabs are defined directly in `_layout.tsx`.
- `package.json` `"main": "index.ts"` is required for widget registration ordering.
- iOS widget support is a known TODO.
- Known bugs: widget sometimes stuck on "Loading..." (timeout handler mitigates). Web only: My Favorites logs a React hydration error (#418) on direct load because the "Local Time" clock differs from the pre-rendered HTML.
- Domain terms (Route, Stop, ETA, Favorite, Favorite board) are defined in `GLOSSARY.md`.
