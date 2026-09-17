# widget/ — Android Background Widget

**Context:** These files run as Android background tasks via `react-native-android-widget`, NOT inside a React component tree.

---

## CRITICAL CONSTRAINTS

- **No React hooks.** No `useState`, `useEffect`, `useCallback`, etc. — background task context has no React lifecycle.
- **React Compiler disabled** for this directory (`babel.config.js` sources filter). Do not add patterns that depend on it.
- **Must `import React from "react"` explicitly** — JSX transform is not active here.
- **Widget name `"BusETAWidget"` must exactly match** `app.json` plugin config `widgets[].name`.

---

## Files

| File | Purpose | Exports |
|------|---------|---------|
| `widget-task-handler.tsx` | Entry point for widget lifecycle events. Fetches routes from AsyncStorage, fetches ETAs, renders widget. | `widgetTaskHandler(props: WidgetTaskHandlerProps)` |
| `BusETAWidget.tsx` | UI renderer. Converts grouped ETA data into `FlexWidget`/`TextWidget` tree. | `BusETAWidget({ groupedEtas, etas, isLoading, error })` |
| `HelloWidget.tsx` | Unused example widget. | `HelloWidget()` |

---

## Data Flow

```
widgetTaskHandler (entry)
  ├─ getRoutesWithTimeout() → AsyncStorage (1.5s timeout, falls back to defaultRoutes)
  │     └─ utils/routes_storage.ts: parseStoredRoutes()
  ├─ getAllBUSETAs() → KMB API (from utils/fetch.ts)
  ├─ fetchStop() → stop name lookup
  ├─ utils/eta_grouping.ts: buildGroupedEtas() — group ETAs by normalized stop name
  └─ props.renderWidget(<BusETAWidget groupedEtas={...} />)
```

- **Timeout:** `withTimeout(12000, ...)` wraps the entire fetch+render to prevent widget stuck on "Loading...".
- **Fallback routes:** If AsyncStorage read fails or times out, uses hardcoded `defaultRoutes` from `utils/routes_storage.ts` (272P, 272X) — shared with `app/my_favorites.tsx`.
- **`nameToWidget` map** (line 59): Maps widget name string → component. Must include any new widgets.
- **ETA grouping:** `getRouteETAs` (earliest-arrival-per-route) lives in `utils/eta_grouping.ts`, imported by `BusETAWidget.tsx` — not defined inline, so it can be unit-tested without rendering.

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new widget | Create `NewWidget.tsx`, add to `nameToWidget` in `widget-task-handler.tsx`, register in `app.json` |
| Change widget refresh timeout | `widget-task-handler.tsx` line 63 (`WIDGET_FETCH_TIMEOUT_MS`) |
| Change widget appearance | `BusETAWidget.tsx` — FlexWidget/TextWidget styles |
| Change default routes | `widget-task-handler.tsx` line 8 (`defaultRoutes`) |
| Change AsyncStorage read timeout | `widget-task-handler.tsx` line 40 (`withTimeout(1500, ...)`) |

---

## Anti-Patterns

- **Known `as any` violations:** `widget-task-handler.tsx` line 70 (Widget type cast) and `BusETAWidget.tsx` lines 91-92 (legacy `stopName` access). Fix with type guards — do not add more.
- **NEVER** use React hooks in these files.
- **NEVER** import from `app/` — only from `utils/` and widget-internal files.
- **NEVER** add blocking async operations without timeout wrapper.
