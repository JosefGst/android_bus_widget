# Chinese language support plan

This plan adds Traditional (繁) and Simplified (简) Chinese to the Bus ETA app, next to English. The spec is `docs/ideas/chinese-language/spec.md`. One `Language` value (`'en' | 'tc' | 'sc'`) drives the screens, the Route map and the widget. The app follows the phone language until the user taps the header button, which saves a choice.

The plan has three PRs, merged in order:

1. **L1.** Language core in `utils/`. No visible change.
2. **L2.** App screens and the Route map. Depends on L1.
3. **L3.** Widget text and redraw on language change. Depends on L2.

## How to read this

One box is one unit of work. Check a box only when its evidence exists, such as a test run, a screenshot or a commit SHA. A nested box is a sub-step of the box above it.

Each PR builds on the one before it, so the PRs merge in order. The operator (you) merges every PR. Each PR is done when its unit tests, its Playwright or Maestro checks and its manual device check are all green. Tests alone are not enough. L2 and L3 change what the user sees, so each gets a review with screenshots before merge.

## Program checklist

- [ ] Branch `josefgst/chinese_lang` is rebased on `main`, and `npm test` passes there. Record the SHA.
- [ ] Spec open questions are answered or explicitly deferred (attribution text, 我的收藏 vs 我的最爱).
- [ ] L1 merged.
- [ ] L2 merged.
- [ ] L3 merged.

### Device check recipe, for L2 and L3

- [ ] Build and install the release APK with `npx expo run:android --variant release`, then `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
- [ ] Open the app with `openLink: bus://` (see `.maestro/subflows/open_app.yaml`). `launchApp` is blocked on the Honor tablet.
- [ ] Save screenshots to `docs/ideas/chinese-language/screens/<pr>-<slug>.png`. Keep them out of the commit unless the reviewer asks for them.
- [ ] End each session on English, so the existing Maestro flows still find their English labels.

## Add the language core (L1)

**Depends on.** None.

**Files.**

- [ ] Create `utils/language.ts` and `utils/language.test.ts`.
- [ ] Create `utils/strings.ts` and `utils/strings.test.ts`.
- [ ] Edit `utils/fetch.ts`. Add `orig_tc`, `orig_sc`, `dest_tc` and `dest_sc` to `ROUTS`, and `dest_tc` and `dest_sc` to `ETA`. Make `name_tc` and `name_sc` on `Stop` the shape `localized()` takes.
- [ ] Edit `utils/string_formatting.ts` and its test.
- [ ] Edit `package.json` with `npx expo install expo-localization`.
- [ ] Edit `GLOSSARY.md`. Add **Language**, the one setting that picks English, 繁 or 简 for all text.

**Build.**

- [ ] `languageFromLocales(locales)`. The first locale decides. `zh` with script `Hant`, or region `HK`, `MO` or `TW`, gives `tc`. `zh` with script `Hans`, or region `CN` or `SG`, gives `sc`. Plain `zh` gives `tc`. Anything else gives `en`.
- [ ] `getLanguage()`, `setLanguage()` and `onLanguageChanged()` under the key `app_language`. Model them on `utils/favorites.ts`. Writes are serialized, and a stored value that is not a `Language` counts as no choice.
- [ ] `nextLanguage()` cycles `en → tc → sc → en`.
- [ ] `localized(record, field, language)` returns `${field}_${language}`, or `${field}_en` when that field is missing or empty.
- [ ] `STRINGS: Record<Language, Strings>` with the keys and drafts from the spec's Draft Translations table. Interpolated strings are functions, as in `arrivesIn(minutes, time)`.
- [ ] `normalizeStopName()` also strips full-width parentheses `（…）`.

**You see.**

- [ ] Nothing changes in the app. `npm test` and `npm run lint` pass.

**Verify, unit.**

- [ ] `utils/language.test.ts` covers `zh-Hant-HK`, `zh-HK`, `zh-TW`, `zh-Hans-CN`, `zh-SG`, plain `zh`, `en-US` and an empty list. It also covers that a saved choice beats the phone, that a corrupt stored value is ignored, that a listener fires on `setLanguage`, and that `localized` falls back to `_en`.
- [ ] `utils/strings.test.ts` checks that every language has a non-empty value for every key and that `arrivesIn` puts both values into the text.
- [ ] `utils/string_formatting.test.ts` gains `尖沙咀東（麼地道）` becoming `尖沙咀東`.
- [ ] Run `npm test`.

**Review gate.** None. L1 changes no interaction.

## Show screens and the Route map in the chosen language (L2)

**Depends on.** L1.

**Files.**

- [ ] Create `components/language_context.tsx` with `LanguageProvider` and `useLanguage()`, which returns `{ language, strings, setLanguage }`.
- [ ] Create `components/LanguageButton.tsx`.
- [ ] Edit `app/_layout.tsx`, `app/index.tsx`, `app/routes_stop.tsx` and `app/my_favorites.tsx`.
- [ ] Edit `utils/route_stop_map.ts`, `utils/favorite_board.ts` and their tests.
- [ ] Edit `components/stop_map_html.ts`, `components/StopMap.tsx` and `components/StopMap.web.tsx`.
- [ ] Edit `widget/widget-task-handler.tsx` so it passes `await getLanguage()` to `loadFavoriteBoard`.
- [ ] Edit `e2e/mocks.ts` and add `e2e/language.spec.ts`.
- [ ] Create `.maestro/language_toggle.yaml`.

**Build.**

- [ ] `LanguageProvider` starts from `languageFromLocales(getLocales())` synchronously, so the first frame is already in the phone language. It then applies the saved choice and subscribes to `onLanguageChanged`.
- [ ] `LanguageButton` sits in the tab header (`headerRight` in `_layout.tsx`). It shows `EN`, `繁` or `简`, and on press calls `setLanguage(nextLanguage(language))`. Its accessibility label comes from `strings.languageButtonLabel`.
- [ ] Tab titles and every string listed in the spec's What Changes Where table come from `strings`.
- [ ] Home shows `localized(route, 'orig', language) → localized(route, 'dest', language)`.
- [ ] Routes Stop keeps the `Stop` records it loads instead of a `stopNameMap` of English names. Names are derived at render, so a language change needs no new request.
- [ ] `buildRouteMarkers(routeStops, stops, language)` uses `localized(stop, 'name', language)`.
- [ ] `loadFavoriteBoard(favorites, language)` groups by the localized, normalized name.
- [ ] The map page handles a new `setLanguage` message. It calls `setUrl()` on the label layer with `label/hk/<language>`. Hosts send it on `ready` and on change, next to `setMarkers`. Add the message type next to the others in `utils/route_stop_map.ts`.
- [ ] `e2e/mocks.ts` gives every mocked Route, Stop and ETA `_tc` and `_sc` fields.

**You see.**

- [ ] On a phone set to English, nothing looks different from `main`.
- [ ] One tap on `EN` shows `繁`. Tabs read 主頁 / 路線車站 / 我的最愛, Home shows 大學站 → 白石角(循環線) for 272A, and Routes Stop shows Chinese Stop names and Chinese map labels.
- [ ] A second tap shows `简` with Simplified text. A third tap returns to English.
- [ ] After a restart, the last choice is still in effect.

**Verify, unit.**

- [ ] `utils/route_stop_map.test.ts` checks that marker names follow the language and fall back to the English name.
- [ ] `utils/favorite_board.test.ts` checks that group names follow the language and that two Stops sharing a Chinese base name land in one group.
- [ ] Run `npm test` and `npm run lint`.

**Verify, live.**

- [ ] Playwright, `e2e/language.spec.ts`. A browser with locale `en-US` shows English. A browser with locale `zh-HK` shows 繁 without a tap. Tapping the button cycles the tab titles and the Home Route text. A reload keeps the choice. Run `npm run test:e2e`.
- [ ] Playwright regression. The existing `e2e/*.spec.ts` pass unchanged under locale `en-US`.
- [ ] Maestro, `.maestro/language_toggle.yaml`. Tap the button through 繁 and 简 and assert a tab title in each, then end on `EN`. Run `npm run test:maestro`, and confirm the existing flows still pass after it.
- [ ] Device check on the Honor tablet. Open Route 272A in 繁 with the map shown. Save `L2-routes-stop-tc.png`. Pass when the list, the markers and the map labels are all Chinese.
- [ ] Device check. Switch to 简 with the map open. Save `L2-map-sc.png`. Pass when no 繁 label tiles remain after the map settles.
- [ ] Device check. My Favorites in 繁. Save `L2-favorites-tc.png`. Pass when the groups, the "My Routes" labels and the ETA sentence are Chinese and the countdown still ticks.

**Review gate.** The operator reviews before merge.

- [ ] Post the three device screenshots and a short screen recording of the button cycling through all three languages.

## Show the widget in the chosen language (L3)

**Depends on.** L2.

**Files.**

- [ ] Edit `widget/BusETAWidget.tsx`. It takes `strings: Strings` as a prop and stays hook-free.
- [ ] Edit `widget/widget-task-handler.tsx`. `renderBusWidget()` reads `getLanguage()` once per render and passes `STRINGS[language]`. `TAP_TO_REFRESH` moves into the table.
- [ ] Edit `widget-registration.ts`. Add `onLanguageChanged(() => refreshBusWidget())` next to the Favorites listener.
- [ ] Edit `widget/AGENTS.md` and `AGENTS.md`. Note the language source, and that widget text comes from `utils/strings.ts`.

**Build.**

- [ ] Every widget string, including `{m} min`, comes from `strings`.

**You see.**

- [ ] Tapping the language button in the app redraws the home-screen widget in the new language within a few seconds, with no tap on the widget.

**Verify, unit.**

- [ ] `utils/strings.test.ts` already covers the widget keys. No widget rendering test exists, by project convention.
- [ ] Run `npm test` and `npm run lint`.

**Verify, live.**

- [ ] Device check. With the widget on the home screen, switch the app to 繁 and go home. Save `L3-widget-tc.png`. Pass when the Stop names and `分` are Chinese.
- [ ] Device check. Force-stop the app (`adb shell am force-stop`), then tap the widget to refresh. Save `L3-widget-headless.png`. Pass when the widget is still in 繁. This proves `getLanguage()` works in the headless task.
- [ ] Device check. Switch back to `EN`. Pass when the widget returns to English.

**Review gate.** The operator reviews before merge.

- [ ] Post the widget screenshots.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Remove the screenshots folder, or move it under `docs/` if you want to keep them.

## Appendix A. Facts checked before planning

- The live API returns `_en`, `_tc` and `_sc` on `/route`, `/stop` and `/eta` (Route 272A, 2026-11-13).
- All 6772 Stops have `name_tc` and `name_sc`. 19 Chinese names use full-width parentheses, and that is why L1 changes `normalizeStopName()`.
- The Lands Department label tiles answer 200 for `en`, `tc` and `sc`.
- Two facts stay unproven. One is `getLocales()` in the widget's headless task, and the other is CJK rendering in `TextWidget`. L3's device checks cover both.

## Appendix B. Alternatives rejected

- **i18next or react-intl.** They add a dependency and runtime key lookups for about 30 strings in 3 languages. A `Record<Language, Strings>` gets missing keys caught by the compiler.
- **Two separate PRs for the screens and the map.** The map markers and the list share the same Stop names. Splitting them would ship a screen with mixed languages.
- **Saving the phone language at first start.** The app would stop following a user who later changes the phone language without ever touching the button.
- **A Settings tab.** One setting does not justify a fourth tab (your call, 2026-11-13).

## Appendix C. Risks

- **Native rebuild (L1).** `expo-localization` is a native module. Dev clients and the release APK must be rebuilt, and CI's APK job picks it up.
- **Maestro labels (L2).** Every flow taps English labels. A test tablet left on 繁 breaks them. The new flow ends on `EN`, and the device recipe says to end on English.
- **Headless language lookup (L3).** If `getLocales()` throws in the widget task, `getLanguage()` must catch it and use the saved choice, then English. Add that fallback in L1 and test it.
- **Map tile swap (L2).** Old-language tiles can stay cached. The `L2-map-sc` device check covers it.
- **Translation quality.** The drafts in the spec need a native reader before release.

## Appendix D. Reading list

- `AGENTS.md` and `widget/AGENTS.md`, for the widget's background-task rules.
- `utils/favorites.ts`, the model for storage, write serialization and change listeners.
- `docs/ideas/stop-names-cache.md`, for why a language change must never trigger a Stop list download.
- `GLOSSARY.md`, for the domain terms used in the strings.
