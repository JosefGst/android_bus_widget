import type { RouteRow } from './arrival_display'
import type { Language } from './language'
import type { MapSizeName } from './map_size'

// The app's own text. 'tc' is spoken Hong Kong Cantonese in Traditional characters; 'sc' is Mandarin. KMB names (Routes, Stops) come from the API in each language instead.

export type Strings = {
  languageButtonText: string
  languageButtonLabel: string
  searchPlaceholder: string
  noRoutes: string
  keypadClear: string
  routeHeader: (route: string) => string
  routeHeaderEmpty: string
  invalidRoute: string
  fetchFailed: string
  routeMap: string
  mapUnavailable: string
  mapAttribution: string
  retryStopNamesLabel: string
  retryStopNames: string
  loadingEta: string
  noStops: string
  noBusesForStop: string
  widgetLoading: string
  widgetEmpty: string
  widgetTapToRefresh: string
  minutesShort: (minutes: string) => string
  myBuses: string
  updatedAt: (time: string) => string
  refresh: string
  changeMyBuses: string
  done: string
  emptyMyBuses: string
  toDestination: string
  arrivingNow: string
  minutesUnit: string
  thenMinutes: (minutes: number) => string
  noTimeYet: string
  routeRowLabel: (route: string, stop: string, dest: string, time: string) => string
  spokenMinutes: (minutes: number) => string
  removeRouteAtStop: (route: string, stop: string) => string
  remove: string
  findARoute: string
  back: string
  busNumber: string
  routesMatch: (count: number, query: string) => string
  routeResultLabel: (route: string, from: string, to: string) => string
  fromOrigin: string
  keypadDelete: string
  keypadLetters: string
  /** Spoken label of the map's resize handle, with the current size. */
  mapSizeLabel: (size: MapSizeName) => string
  tapYourStop: string
  nextBus: string
  afterThat: string
  atTime: (time: string) => string
  saveToMyBuses: string
  savedToMyBuses: string
  wholeRoute: string
  whereAmI: string
  stopRowLabel: (seq: string, name: string) => string
  routesLoadFailed: string
  tryAgain: string
}

const EN: Strings = {
  languageButtonText: 'EN',
  languageButtonLabel: 'Language: English. Tap to change.',
  searchPlaceholder: 'Bus number',
  noRoutes: 'No routes found.',
  keypadClear: 'Clear',
  routeHeader: route => `Route: ${route}`,
  routeHeaderEmpty: 'Route',
  invalidRoute: 'Invalid route, bound, or service type',
  fetchFailed: 'Failed to fetch data',
  routeMap: 'Route map',
  mapUnavailable: 'Map unavailable',
  mapAttribution: '&copy; Map information from Lands Department',
  retryStopNamesLabel: 'Retry loading stop names',
  retryStopNames: 'Couldn\'t load stop names — Retry',
  loadingEta: 'Loading ETA...',
  noStops: 'No stops found for this route.',
  noBusesForStop: 'No buses found for this stop.',
  widgetLoading: 'Loading...',
  widgetEmpty: 'No buses available',
  widgetTapToRefresh: 'Tap to refresh',
  minutesShort: minutes => `${minutes} min`,
  myBuses: 'My Buses',
  updatedAt: time => `Updated ${time}`,
  refresh: 'Refresh',
  changeMyBuses: 'Change my buses',
  done: 'Done',
  emptyMyBuses: 'No buses saved yet. Find a route, tap your stop, then tap Save.',
  toDestination: 'To',
  arrivingNow: 'Now',
  minutesUnit: 'min',
  thenMinutes: minutes => `then ${minutes} min`,
  noTimeYet: 'No time yet',
  routeRowLabel: (route, stop, dest, time) => `Open ${route} at ${stop}. To ${dest}, ${time}`,
  spokenMinutes: minutes => `${minutes} min`,
  removeRouteAtStop: (route, stop) => `Remove ${route} at ${stop}`,
  remove: 'Remove',
  findARoute: 'Find a Route',
  back: 'Back',
  busNumber: 'Bus number',
  routesMatch: (count, query) => (count === 1 ? `1 route matches “${query}”` : `${count} routes match “${query}”`),
  routeResultLabel: (route, from, to) => `${route}, from ${from} to ${to}`,
  fromOrigin: 'From',
  keypadDelete: 'Delete',
  keypadLetters: 'Letters',
  mapSizeLabel: size => `Map size: ${{ small: 'a third', half: 'half', large: 'large' }[size]}. Tap or drag to change.`,
  tapYourStop: 'Tap your stop to see the next buses',
  nextBus: 'Next bus',
  afterThat: 'After that',
  atTime: time => `at ${time}`,
  saveToMyBuses: 'Save to My Buses',
  savedToMyBuses: 'Saved to My Buses',
  wholeRoute: 'Whole route',
  whereAmI: 'Where am I?',
  stopRowLabel: (seq, name) => `${seq}, ${name}`,
  routesLoadFailed: "Couldn't load the bus routes. Check the internet connection and try again.",
  tryAgain: 'Try again',
}

const TC: Strings = {
  languageButtonText: '粵',
  languageButtonLabel: '語言：廣東話。撳呢度轉。',
  searchPlaceholder: '巴士號碼',
  noRoutes: '搵唔到路線。',
  keypadClear: '清除',
  routeHeader: route => `路線：${route}`,
  routeHeaderEmpty: '路線',
  invalidRoute: '路線、方向或者服務類別唔啱',
  fetchFailed: '攞唔到資料',
  routeMap: '路線地圖',
  mapUnavailable: '睇唔到地圖',
  mapAttribution: '&copy; 地圖資料由地政總署提供',
  retryStopNamesLabel: '再試下載入車站名',
  retryStopNames: '載入唔到車站名，再試',
  loadingEta: '載入緊到站時間…',
  noStops: '呢條路線冇車站。',
  noBusesForStop: '呢個站冇巴士。',
  widgetLoading: '載入緊…',
  widgetEmpty: '冇巴士',
  widgetTapToRefresh: '撳呢度更新',
  minutesShort: minutes => `${minutes} 分`,
  myBuses: '我嘅巴士',
  updatedAt: time => `${time} 更新`,
  refresh: '更新',
  changeMyBuses: '改我嘅巴士',
  done: '搞掂',
  emptyMyBuses: '仲未有巴士。先搵路線，撳你個站，再撳「加入我嘅巴士」。',
  toDestination: '去',
  arrivingNow: '到站',
  minutesUnit: '分鐘',
  thenMinutes: minutes => `跟住 ${minutes} 分鐘`,
  noTimeYet: '未有時間',
  routeRowLabel: (route, stop, dest, time) => `打開 ${route}，喺${stop}。去${dest}，${time}`,
  spokenMinutes: minutes => `${minutes} 分鐘`,
  removeRouteAtStop: (route, stop) => `刪除 ${route}，喺${stop}`,
  remove: '刪除',
  findARoute: '搵路線',
  back: '返回',
  busNumber: '巴士號碼',
  routesMatch: (count, query) => `有 ${count} 條路線啱「${query}」`,
  routeResultLabel: (route, from, to) => `${route}，由${from}去${to}`,
  fromOrigin: '由',
  keypadDelete: '刪除',
  keypadLetters: '字母',
  mapSizeLabel: size => `地圖大細：${{ small: '三分一', half: '一半', large: '大' }[size]}。撳或者拉嚟改。`,
  tapYourStop: '撳你個站，睇下一班巴士',
  nextBus: '下一班',
  afterThat: '跟住嗰班',
  atTime: time => `${time} 到`,
  saveToMyBuses: '加入我嘅巴士',
  savedToMyBuses: '已經加入我嘅巴士',
  wholeRoute: '成條路線',
  whereAmI: '我喺邊度？',
  stopRowLabel: (seq, name) => `${seq}，${name}`,
  routesLoadFailed: '載入唔到巴士路線。請檢查網絡，再試一次。',
  tryAgain: '再試一次',
}

const SC: Strings = {
  languageButtonText: '简',
  languageButtonLabel: '语言：简体中文。按此切换。',
  searchPlaceholder: '巴士号码',
  noRoutes: '找不到路线。',
  keypadClear: '清除',
  routeHeader: route => `路线：${route}`,
  routeHeaderEmpty: '路线',
  invalidRoute: '路线、方向或服务类别无效',
  fetchFailed: '未能载入资料',
  routeMap: '路线地图',
  mapUnavailable: '地图无法使用',
  mapAttribution: '&copy; 地图资料由地政总署提供',
  retryStopNamesLabel: '重新载入车站名称',
  retryStopNames: '未能载入车站名称，重试',
  loadingEta: '正在载入到站时间…',
  noStops: '此路线没有车站。',
  noBusesForStop: '此车站没有巴士。',
  widgetLoading: '载入中…',
  widgetEmpty: '没有巴士',
  widgetTapToRefresh: '按此刷新',
  minutesShort: minutes => `${minutes} 分`,
  myBuses: '我的巴士',
  updatedAt: time => `更新时间：${time}`,
  refresh: '刷新',
  changeMyBuses: '更改我的巴士',
  done: '完成',
  emptyMyBuses: '还没有收藏巴士。请先搜索路线，按你的车站，再按“收藏”。',
  toDestination: '往',
  arrivingNow: '即将到站',
  minutesUnit: '分钟',
  thenMinutes: minutes => `之后 ${minutes} 分钟`,
  noTimeYet: '未有时间',
  routeRowLabel: (route, stop, dest, time) => `打开 ${route}，${stop}。往${dest}，${time}`,
  spokenMinutes: minutes => `${minutes} 分钟`,
  removeRouteAtStop: (route, stop) => `移除 ${route}，${stop}`,
  remove: '移除',
  findARoute: '搜索路线',
  back: '返回',
  busNumber: '巴士号码',
  routesMatch: (count, query) => `${count} 条路线符合“${query}”`,
  routeResultLabel: (route, from, to) => `${route}，由${from}往${to}`,
  fromOrigin: '由',
  keypadDelete: '删除',
  keypadLetters: '字母',
  mapSizeLabel: size => `地图大小：${{ small: '三分之一', half: '一半', large: '大' }[size]}。点按或拖动以更改。`,
  tapYourStop: '按你的车站，查看下一班巴士',
  nextBus: '下一班',
  afterThat: '再下一班',
  atTime: time => `${time} 到达`,
  saveToMyBuses: '收藏到我的巴士',
  savedToMyBuses: '已收藏到我的巴士',
  wholeRoute: '整条路线',
  whereAmI: '我在哪里？',
  stopRowLabel: (seq, name) => `${seq}，${name}`,
  routesLoadFailed: '未能载入巴士路线。请检查网络连接，然后再试一次。',
  tryAgain: '再试一次',
}

export const STRINGS: Record<Language, Strings> = { en: EN, tc: TC, sc: SC }

/** A Route row read aloud: "3 min, then 15 min", "Now", or "No time yet". */
export function spokenArrival(strings: Strings, { next, then }: RouteRow): string {
  const first =
    next.kind === 'now' ? strings.arrivingNow : next.kind === 'minutes' ? strings.spokenMinutes(next.minutes) : strings.noTimeYet
  return then === null ? first : `${first}, ${strings.thenMinutes(then)}`
}
