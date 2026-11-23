# AGENTS.md — Bus ETA App

Expo React Native app (React 19, RN 0.81) targeting Android + Web. Displays KMB bus arrival times with an Android home-screen widget.

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
npm run test:maestro                             # Maestro UI flows on a connected Android device (release APK installed)
```

---

## Architecture & Data Flow

```
index.ts
  ├─ widget-registration.ts  →  widget/widget-task-handler.tsx  →  widget/BusETAWidget.tsx
  │     │                              └─ utils/favorites (listForWidget), utils/favorite_board
  │     └─ onFavoritesChanged → widget/refresh_widget.tsx (Android only)
  └─ expo-router/entry
      └─ app/_layout.tsx (2 tabs + Routes Stop page)
          ├─ app/find_route.tsx     → utils/fetch, utils/route_search, components/NumericKeypad, components/LetterKeypad
          ├─ app/routes_stop.tsx    → components/use_route_stop_session → utils/route_stop_session, utils/favorites,
          │                            utils/route_stop_map, components/StopMap, components/SelectedStopCard
          └─ app/index.tsx          → utils/favorites, utils/favorite_board (→ utils/stops), utils/arrivals,
                                       utils/time_formatting, components/RouteBadge, components/theme
```


## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (JosefGst/android_bus_widget) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
