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
| `widget-task-handler.tsx` | Entry point for widget lifecycle events. Shows Loading, then awaits `renderBusWidget()`. | `widgetTaskHandler(props)`, `renderBusWidget()`, `BUS_WIDGET_NAME` |
| `refresh_widget.tsx` | Re-renders the widget immediately via `requestWidgetUpdate`. Subscribed to `onFavoritesChanged` and `onLanguageChanged` in `widget-registration.ts` (Android only). | `refreshBusWidget()` |
| `BusETAWidget.tsx` | UI renderer: dark tile, "My Buses" + "<time> · tap to update", then a scrollable `ListWidget` with one row per Route (white route badge, Stop, large minutes or an amber "Now"). Layout only; all text comes from props. Colours mirror `components/theme.ts` (widget/ must not import components/). | `BusETAWidget({ strings, rows, updated, isLoading, error })` |
| `HelloWidget.tsx` | Unused example widget. | `HelloWidget()` |

---

## Data Flow

```
widgetTaskHandler (scheduled update, tap, add, resize)      refreshBusWidget (Favorite added/removed)
  ├─ renderWidget(<BusETAWidget isLoading />)                 └─ requestWidgetUpdate(renderBusWidget)
  └─ renderWidget(await renderBusWidget())
        renderBusWidget()  (never rejects; 12s timeout → "Tap to refresh")
          ├─ utils/language.ts: getLanguage()      (1.5s timeout → phone language) → STRINGS[language]
          ├─ utils/favorites.ts: listForWidget()   (1.5s timeout → starter Favorites)
          └─ utils/favorite_board.ts: loadFavoriteBoard()   (rejects only if every ETA request fails)
```

- **One render path:** both the task handler and the immediate refresh use `renderBusWidget()`. Change data loading there, not in two places.
- **Widget name:** `BUS_WIDGET_NAME` must match `app.json`. A new widget needs its own name check in `widgetTaskHandler` and an `app.json` entry.
- **Grouping/ordering** live in `utils/favorite_board.ts`; the rows (Stop name title-cased, "Now" / "N min" / "--", counted from render time) come from `widgetRows()` in `utils/widget_rows.ts`. Both are unit-tested; this folder only lays out.
- **Widget styles:** only `FlexWidget`/`TextWidget`/`ListWidget` props exist (`flexGap`, `maxLines`, `truncate`, no `flex` on `TextWidget`; wrap it in a `FlexWidget`). No custom fonts in the widget.
- **Language:** never hardcode widget text; add it to `utils/strings.ts`. Stop names arrive already localized in the board.

---

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new widget | Create `NewWidget.tsx`, handle its name in `widgetTaskHandler`, register in `app.json` | |
| Change widget refresh timeout | `widget-task-handler.tsx` (`WIDGET_FETCH_TIMEOUT_MS`) | |
| Change widget appearance | `BusETAWidget.tsx` | FlexWidget/TextWidget styles |
| Change starter Favorites | `utils/favorites.ts` (`STARTER_FAVORITES`) | Shared with the app |
| Change storage read timeout | `utils/favorites.ts` (`listForWidget`) | |

---

## Anti-Patterns

- **NEVER** use `as any` — this folder has none; keep it that way.
- **NEVER** use React hooks in these files.
- **NEVER** import from `app/` — only from `utils/` and widget-internal files. `utils/` must never import from here either (use `onFavoritesChanged` to react to changes).
- **NEVER** add blocking async operations without timeout wrapper.
