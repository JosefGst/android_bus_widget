# Chinese Language Support

## Problem Statement
How might we let a Hong Kong rider read the app, the Route map and the widget in Traditional or Simplified Chinese, not only in English?

## Recommended Direction
The app supports three languages: English, Traditional Chinese (繁) and Simplified Chinese (简). One language setting drives everything the user reads: screens, the Route map labels and the widget.

The language comes from the phone. A phone set to Chinese for Hong Kong, Macau or Taiwan gets 繁, a phone set to Chinese for China or Singapore gets 简, and every other phone gets English. A small button in the tab header shows the current language ("EN", "繁" or "简"). Each tap moves to the next language and saves the choice. A saved choice wins over the phone language from then on.

Text comes from two sources:

- **KMB data.** The KMB API already sends every name in all three languages: `orig_*` and `dest_*` on a Route, `name_*` on a Stop, `dest_*` and `rmk_*` on an ETA, with the suffixes `_en`, `_tc` and `_sc`. One response has all three, so a language change needs no new request. This matters because request bursts get the app 403'd.
- **The app's own text.** Tab names, buttons, empty states, the ETA sentence and the widget states come from one typed string table. The table has one entry per language, and TypeScript rejects an entry with a missing key.

The language code is `'en' | 'tc' | 'sc'`, the same suffix the API uses, so picking a field needs no mapping table.

## Facts checked against the live API (2026-11-13)
- `/route`, `/stop` and `/eta` return `_en`, `_tc` and `_sc` fields. Example: Route 272A runs from 大學站 / 大学站 to 白石角(循環線) / 白石角(循环线).
- All 6772 Stops in `/stop` have non-empty `name_tc` and `name_sc`. The Stop cache saves the whole API object, so installed apps most likely already have the Chinese names cached and need no new download.
- 19 Chinese Stop names use full-width parentheses, as in 尖沙咀東（麼地道）. `normalizeStopName()` only strips ASCII `(...)`. Without a fix, these names keep their parentheses in Chinese and Stops that group together in English would split apart on the Favorite board.
- The Lands Department label tiles exist in all three languages: `label/hk/en`, `label/hk/tc` and `label/hk/sc` all return 200.

## Data Shape
```ts
// utils/language.ts
export type Language = 'en' | 'tc' | 'sc'
export const LANGUAGES: readonly Language[] = ['en', 'tc', 'sc']

// Pure: the first locale in the phone's list decides.
export function languageFromLocales(locales: readonly Locale[]): Language
// Saved choice, else phone language. Works in the widget task too.
export async function getLanguage(): Promise<Language>
export async function setLanguage(language: Language): Promise<void>
export function onLanguageChanged(listener: (language: Language) => void): () => void
export const nextLanguage = (language: Language): Language // en → tc → sc → en

// Picks `${field}_${language}`, falls back to `${field}_en`.
export function localized<F extends string>(
  record: { [K in `${F}_en`]: string } & { [K in `${F}_${'tc' | 'sc'}`]?: string },
  field: F,
  language: Language,
): string

// utils/strings.ts
export type Strings = { tabHome: string; /* … */ arrivesIn: (minutes: string, time: string) => string }
export const STRINGS: Record<Language, Strings>
```

The saved choice lives under the AsyncStorage key `app_language`. That key holds only a choice the user made. Phone language is never saved, so a user who never taps the button keeps following the phone.

## What Changes Where
| Surface | KMB names | App text |
|---|---|---|
| Home (`app/index.tsx`) | Route origin → destination | Search placeholder, "No routes found." |
| Routes Stop (`app/routes_stop.tsx`) | Stop names in the list and on map markers | Header, map buttons and their accessibility labels, ETA sentence, empty and error states |
| My Favorites (`app/my_favorites.tsx`) | Stop group names, "My Routes" Stop labels | "Local Time", ETA sentence, empty states |
| Route map (`components/stop_map_html.ts`) | Marker names (already sent by React) | Label tiles switch with a new `setLanguage` message |
| Tabs (`app/_layout.tsx`) | none | Tab titles, the language button |
| Widget (`widget/`) | Stop group names | "Loading...", "No buses available", "Tap to refresh", "min" |

Route codes (272A, N29), ETA times and the numeric keypad stay as they are. Route search matches Route codes only, so it needs no change.

## Draft Translations
These are drafts for review by a native reader before release.

| Key | English | 繁 | 简 |
|---|---|---|---|
| tabHome | Home | 主頁 | 主页 |
| tabRoutesStop | Routes Stop | 路線車站 | 路线车站 |
| tabFavorites | My Favorites | 我的最愛 | 我的收藏 |
| searchPlaceholder | Search by route number... | 輸入路線號碼… | 输入路线号码… |
| noRoutes | No routes found. | 找不到路線。 | 找不到路线。 |
| routeHeader | Route: {route} | 路線：{route} | 路线：{route} |
| showMap / hideMap | Show map / Hide map | 顯示地圖 / 隱藏地圖 | 显示地图 / 隐藏地图 |
| showRoute | Show route | 顯示路線 | 显示路线 |
| showMyLocation | Show my location | 顯示我的位置 | 显示我的位置 |
| mapUnavailable | Map unavailable | 地圖無法使用 | 地图无法使用 |
| retryStopNames | Couldn't load stop names. Retry | 未能載入車站名稱，重試 | 未能载入车站名称，重试 |
| favoriteStop | Favorite this stop | 收藏此車站 | 收藏此车站 |
| loadingEta | Loading ETA... | 正在載入到站時間… | 正在载入到站时间… |
| noEta | No ETA available | 沒有到站時間 | 没有到站时间 |
| noStops | No stops found for this route. | 此路線沒有車站。 | 此路线没有车站。 |
| arrivesIn | arrives in {m} minutes (ETA: {t}) | {m} 分鐘後到達（{t}） | {m} 分钟后到达（{t}） |
| localTime | Local Time | 現在時間 | 现在时间 |
| myRoutes | My Routes | 我的路線 | 我的路线 |
| noRoutesAdded | No routes added. | 未加入路線。 | 未加入路线。 |
| noBusesForStop | No buses found for this stop. | 此車站沒有巴士。 | 此车站没有巴士。 |
| widgetLoading | Loading... | 載入中… | 载入中… |
| widgetEmpty | No buses available | 沒有巴士 | 没有巴士 |
| widgetTapToRefresh | Tap to refresh | 按此重新整理 | 按此刷新 |
| minutesShort | {m} min | {m} 分 | {m} 分 |
| languageButtonLabel | Language: English. Tap to change. | 語言：繁體中文。按此切換。 | 语言：简体中文。按此切换。 |

## Key Assumptions to Validate
- [ ] `expo-localization`'s `getLocales()` works inside the widget's headless task on the Honor tablet. If it does not, the widget falls back to the saved choice, then English.
- [ ] Android renders CJK in `TextWidget` without clipping at the widget's font size.
- [ ] Chinese Stop names fit the Routes Stop rows and the marker labels without breaking the layout. They are shorter than the English names, so this is likely.
- [ ] Swapping the label tile layer while the map is open does not leave old-language tiles in place.

## MVP Scope
**In:**
- `utils/language.ts` and `utils/strings.ts`, with unit tests.
- `_tc`/`_sc` fields on the `ROUTS` type, and `normalizeStopName()` stripping full-width parentheses too.
- `expo-localization` (needs a native rebuild).
- A `LanguageProvider` and `useLanguage()` hook in `components/`, and the header button in `app/_layout.tsx`.
- Every screen, the Route map and the widget reading names and text in the current language.
- The widget redraws when the language changes, the same way it does after a Favorites change.
- Playwright tests for the toggle with Chinese mock data, a Maestro flow that cycles the button and ends on English, and a `GLOSSARY.md` entry for **Language**.

**Out:** everything below.

## Not Doing (and Why)
- **A "follow phone" option after a manual choice.** Three states on one button stay readable; a fourth does not. Clearing app data resets the choice.
- **Showing ETA remarks (`rmk_*`).** The app does not show them in any language today. That is a separate feature.
- **Searching by Chinese place names.** Search matches Route codes only, on purpose (see `utils/route_search.ts`).
- **Chinese number or time formats.** Times stay in HH:MM digits, which every Hong Kong reader knows. This also avoids depending on Hermes `Intl` support for Chinese locales.
- **Translating log messages.** `console.error` text is for developers.
- **A settings screen.** One header button is enough for one setting.

## Open Questions
- Should the map attribution also appear in Chinese when the labels are Chinese? The Lands Department requires attribution. Keeping the English text is always compliant.
- Is "我的收藏" (简) or "我的最爱" the better name for My Favorites?
- Existing behavior, not in scope: `normalizeStopName()` strips any parenthesized text, so "KWUN TONG (YUE MAN SQUARE) BUS TERMINUS" shows as "KWUN TONG BUS TERMINUS". Chinese names will be cut the same way.
