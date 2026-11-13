import type { Language } from './language'
import { formatEtaToHKTime, getMinutesUntilArrival } from './time_formatting'

// The app's own text. KMB names (Routes, Stops) come from the API in each language instead.

export type Strings = {
  languageButtonText: string
  languageButtonLabel: string
  tabHome: string
  tabRoutesStop: string
  tabFavorites: string
  searchPlaceholder: string
  noRoutes: string
  keypadClear: string
  routeHeader: (route: string) => string
  routeHeaderEmpty: string
  directionAndServiceType: (bound: string, serviceType: string) => string
  invalidRoute: string
  fetchFailed: string
  routeMap: string
  mapUnavailable: string
  mapAttribution: string
  showRoute: string
  showMyLocation: string
  showMap: string
  hideMap: string
  retryStopNamesLabel: string
  retryStopNames: string
  favoriteStop: string
  loadingEta: string
  noEta: string
  noStops: string
  arrivesIn: (minutes: number, time: string) => string
  routeArrivesIn: (route: string, minutes: number, time: string) => string
  routeNoEta: (route: string) => string
  localTime: (time: string) => string
  generatedTimestamp: (time: string) => string
  notAvailable: string
  noBusesForStop: string
  openRouteAtStop: (route: string, stop: string) => string
  myRoutes: string
  noRoutesAdded: string
  removeRoute: (route: string) => string
  widgetLoading: string
  widgetEmpty: string
  widgetTapToRefresh: string
  minutesShort: (minutes: string) => string
}

const EN: Strings = {
  languageButtonText: 'EN',
  languageButtonLabel: 'Language: English. Tap to change.',
  tabHome: 'Home',
  tabRoutesStop: 'Routes Stop',
  tabFavorites: 'My Favorites',
  searchPlaceholder: 'Search by route number...',
  noRoutes: 'No routes found.',
  keypadClear: 'Clear',
  routeHeader: route => `Route: ${route}`,
  routeHeaderEmpty: 'Route',
  directionAndServiceType: (bound, serviceType) => `Direction: ${bound} Service Type: ${serviceType}`,
  invalidRoute: 'Invalid route, bound, or service type',
  fetchFailed: 'Failed to fetch data',
  routeMap: 'Route map',
  mapUnavailable: 'Map unavailable',
  mapAttribution: '&copy; Map information from Lands Department',
  showRoute: 'Show route',
  showMyLocation: 'Show my location',
  showMap: 'Show map',
  hideMap: 'Hide map',
  retryStopNamesLabel: 'Retry loading stop names',
  retryStopNames: 'Couldn\'t load stop names — Retry',
  favoriteStop: 'Favorite this stop',
  loadingEta: 'Loading ETA...',
  noEta: 'No ETA available',
  noStops: 'No stops found for this route.',
  arrivesIn: (minutes, time) => `arrives in ${minutes} minutes (ETA: ${time})`,
  routeArrivesIn: (route, minutes, time) => `${route} will arrive in ${minutes} minutes (ETA: ${time})`,
  routeNoEta: route => `${route}: No ETA available`,
  localTime: time => `Local Time: ${time}`,
  generatedTimestamp: time => `Generated Timestamp: ${time}`,
  notAvailable: 'N/A',
  noBusesForStop: 'No buses found for this stop.',
  openRouteAtStop: (route, stop) => `Open ${route} at ${stop}`,
  myRoutes: 'My Routes',
  noRoutesAdded: 'No routes added.',
  removeRoute: route => `Remove route ${route}`,
  widgetLoading: 'Loading...',
  widgetEmpty: 'No buses available',
  widgetTapToRefresh: 'Tap to refresh',
  minutesShort: minutes => `${minutes} min`,
}

const TC: Strings = {
  languageButtonText: '繁',
  languageButtonLabel: '語言：繁體中文。按此切換。',
  tabHome: '主頁',
  tabRoutesStop: '路線車站',
  tabFavorites: '我的最愛',
  searchPlaceholder: '輸入路線號碼…',
  noRoutes: '找不到路線。',
  keypadClear: '清除',
  routeHeader: route => `路線：${route}`,
  routeHeaderEmpty: '路線',
  directionAndServiceType: (bound, serviceType) => `方向：${bound} 服務類別：${serviceType}`,
  invalidRoute: '路線、方向或服務類別無效',
  fetchFailed: '未能載入資料',
  routeMap: '路線地圖',
  mapUnavailable: '地圖無法使用',
  mapAttribution: '&copy; 地圖資料由地政總署提供',
  showRoute: '顯示路線',
  showMyLocation: '顯示我的位置',
  showMap: '顯示地圖',
  hideMap: '隱藏地圖',
  retryStopNamesLabel: '重新載入車站名稱',
  retryStopNames: '未能載入車站名稱，重試',
  favoriteStop: '收藏此車站',
  loadingEta: '正在載入到站時間…',
  noEta: '沒有到站時間',
  noStops: '此路線沒有車站。',
  arrivesIn: (minutes, time) => `${minutes} 分鐘後到達（${time}）`,
  routeArrivesIn: (route, minutes, time) => `${route} ${minutes} 分鐘後到達（${time}）`,
  routeNoEta: route => `${route}：沒有到站時間`,
  localTime: time => `現在時間：${time}`,
  generatedTimestamp: time => `資料時間：${time}`,
  notAvailable: '不適用',
  noBusesForStop: '此車站沒有巴士。',
  openRouteAtStop: (route, stop) => `打開 ${route}，${stop}`,
  myRoutes: '我的路線',
  noRoutesAdded: '未加入路線。',
  removeRoute: route => `移除路線 ${route}`,
  widgetLoading: '載入中…',
  widgetEmpty: '沒有巴士',
  widgetTapToRefresh: '按此重新整理',
  minutesShort: minutes => `${minutes} 分`,
}

const SC: Strings = {
  languageButtonText: '简',
  languageButtonLabel: '语言：简体中文。按此切换。',
  tabHome: '主页',
  tabRoutesStop: '路线车站',
  tabFavorites: '我的收藏',
  searchPlaceholder: '输入路线号码…',
  noRoutes: '找不到路线。',
  keypadClear: '清除',
  routeHeader: route => `路线：${route}`,
  routeHeaderEmpty: '路线',
  directionAndServiceType: (bound, serviceType) => `方向：${bound} 服务类别：${serviceType}`,
  invalidRoute: '路线、方向或服务类别无效',
  fetchFailed: '未能载入资料',
  routeMap: '路线地图',
  mapUnavailable: '地图无法使用',
  mapAttribution: '&copy; 地图资料由地政总署提供',
  showRoute: '显示路线',
  showMyLocation: '显示我的位置',
  showMap: '显示地图',
  hideMap: '隐藏地图',
  retryStopNamesLabel: '重新载入车站名称',
  retryStopNames: '未能载入车站名称，重试',
  favoriteStop: '收藏此车站',
  loadingEta: '正在载入到站时间…',
  noEta: '没有到站时间',
  noStops: '此路线没有车站。',
  arrivesIn: (minutes, time) => `${minutes} 分钟后到达（${time}）`,
  routeArrivesIn: (route, minutes, time) => `${route} ${minutes} 分钟后到达（${time}）`,
  routeNoEta: route => `${route}：没有到站时间`,
  localTime: time => `现在时间：${time}`,
  generatedTimestamp: time => `资料时间：${time}`,
  notAvailable: '不适用',
  noBusesForStop: '此车站没有巴士。',
  openRouteAtStop: (route, stop) => `打开 ${route}，${stop}`,
  myRoutes: '我的路线',
  noRoutesAdded: '未加入路线。',
  removeRoute: route => `移除路线 ${route}`,
  widgetLoading: '载入中…',
  widgetEmpty: '没有巴士',
  widgetTapToRefresh: '按此刷新',
  minutesShort: minutes => `${minutes} 分`,
}

export const STRINGS: Record<Language, Strings> = { en: EN, tc: TC, sc: SC }

/** One arrival line: minutes and Hong Kong time, or "no ETA" when the API gave no time. Pass `route` to name it. */
export function arrivalText(strings: Strings, eta: string, now: string, route?: string): string {
  const minutes = getMinutesUntilArrival(eta, now)
  if (route === undefined) {
    return minutes === null ? strings.noEta : strings.arrivesIn(minutes, formatEtaToHKTime(eta))
  }
  return minutes === null ? strings.routeNoEta(route) : strings.routeArrivesIn(route, minutes, formatEtaToHKTime(eta))
}
