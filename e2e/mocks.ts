import { Page } from '@playwright/test';

// All app network calls go to this host; intercept them so tests are
// deterministic and don't depend on the live KMB API being up.
const API_HOST = 'https://data.etabus.gov.hk';

const NOW = new Date().toISOString();

export const MOCK_ROUTES = [
  { route: '272P', bound: 'O', service_type: '1', orig_en: 'TUEN MUN', orig_tc: '屯門', orig_sc: '屯门', dest_en: 'CAUSEWAY BAY', dest_tc: '銅鑼灣', dest_sc: '铜锣湾' },
  { route: '272X', bound: 'O', service_type: '1', orig_en: 'TUEN MUN', orig_tc: '屯門', orig_sc: '屯门', dest_en: 'CENTRAL', dest_tc: '中環', dest_sc: '中环' },
  { route: '967', bound: 'O', service_type: '1', orig_en: 'TIN SHUI WAI', orig_tc: '天水圍', orig_sc: '天水围', dest_en: 'ADMIRALTY', dest_tc: '金鐘', dest_sc: '金钟' },
  { route: 'N29', bound: 'O', service_type: '1', orig_en: 'MONG KOK', orig_tc: '旺角', orig_sc: '旺角', dest_en: 'TSUEN WAN', dest_tc: '荃灣', dest_sc: '荃湾' },
];

export const MOCK_STOP_NAMES: Record<string, string> = {
  B464BD6334A93FA1: 'Default Stop One',
  B644204AEDE7A031: 'Default Stop Two',
  MOCKSTOP001: 'Causeway Bay Station',
  MAPSTOP001: 'Mong Kok Map Stop',
  MAPSTOP002: 'Yau Ma Tei Map Stop',
  MAPSTOP003: 'Jordan Map Stop',
};

// Traditional and Simplified names for each mock Stop: [name_tc, name_sc].
export const MOCK_STOP_NAMES_ZH: Record<string, [string, string]> = {
  B464BD6334A93FA1: ['預設車站一', '预设车站一'],
  B644204AEDE7A031: ['預設車站二', '预设车站二'],
  MOCKSTOP001: ['銅鑼灣站', '铜锣湾站'],
  MAPSTOP001: ['旺角地圖站', '旺角地图站'],
  MAPSTOP002: ['油麻地地圖站', '油麻地地图站'],
  MAPSTOP003: ['佐敦地圖站', '佐敦地图站'],
};

const stopNames = (stop: string) => ({
  name_en: MOCK_STOP_NAMES[stop] ?? 'Unknown Stop',
  name_tc: MOCK_STOP_NAMES_ZH[stop]?.[0] ?? '未知車站',
  name_sc: MOCK_STOP_NAMES_ZH[stop]?.[1] ?? '未知车站',
});

// Coordinates (inside Hong Kong) so the Routes Stop map can place markers.
export const MOCK_STOP_COORDS: Record<string, { lat: string; long: string }> = {
  B464BD6334A93FA1: { lat: '22.3930', long: '113.9730' },
  B644204AEDE7A031: { lat: '22.3940', long: '113.9740' },
  MOCKSTOP001: { lat: '22.2800', long: '114.1830' },
  MAPSTOP001: { lat: '22.3190', long: '114.1690' },
  MAPSTOP002: { lat: '22.3120', long: '114.1700' },
  MAPSTOP003: { lat: '22.3050', long: '114.1710' },
};

// Route N29 has several Stops so the map test can pick between markers;
// every other Route has a single Stop so its star button stays unambiguous.
export const MAP_ROUTE = 'N29';
const MAP_ROUTE_STOPS = ['MAPSTOP001', 'MAPSTOP002', 'MAPSTOP003'];

// 1x1 transparent PNG served for every map tile, so tests never hit the tile server.
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const jsonFulfill = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

/** Install mocked responses for every KMB API endpoint the app calls. */
export async function mockKmbApi(page: Page) {
  await page.route('https://mapapi.geodata.gov.hk/**', route =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG })
  );

  await page.route(`${API_HOST}/v1/transport/kmb/route`, route =>
    route.fulfill(
      jsonFulfill({
        type: 'ROUTE',
        version: '1',
        generated_timestamp: NOW,
        data: MOCK_ROUTES,
      })
    )
  );

  // Bulk stop list (exact path, no trailing id segment).
  await page.route(`${API_HOST}/v1/transport/kmb/stop`, route =>
    route.fulfill(
      jsonFulfill({
        type: 'STOP',
        version: '1',
        generated_timestamp: NOW,
        data: Object.keys(MOCK_STOP_NAMES).map(stop => ({ stop, ...stopNames(stop), ...MOCK_STOP_COORDS[stop] })),
      })
    )
  );

  // Single stop lookup: /stop/{stopId}
  await page.route(`${API_HOST}/v1/transport/kmb/stop/*`, route => {
    const stopId = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    route.fulfill(
      jsonFulfill({
        type: 'STOP',
        version: '1',
        generated_timestamp: NOW,
        data: { stop: stopId, ...stopNames(stopId) },
      })
    );
  });

  // Stops for a given route: /route-stop/{route}/{dir}/{service_type}
  await page.route(`${API_HOST}/v1/transport/kmb/route-stop/*/*/*`, route => {
    const segments = new URL(route.request().url()).pathname.split('/');
    const [routeCode, boundDir, svcType] = segments.slice(-3);
    route.fulfill(
      jsonFulfill({
        type: 'ROUTE-STOP',
        version: '1',
        generated_timestamp: NOW,
        data: (routeCode === MAP_ROUTE ? MAP_ROUTE_STOPS : ['MOCKSTOP001']).map((stop, i) => ({
          route: routeCode,
          bound: boundDir === 'inbound' ? 'I' : 'O',
          service_type: svcType,
          seq: String(i + 1),
          stop,
        })),
      })
    );
  });

  // ETA for a stop+route: /eta/{stop}/{route}/{service_type}
  await page.route(`${API_HOST}/v1/transport/kmb/eta/*/*/*`, route => {
    const [, routeCode, svcType] = new URL(route.request().url()).pathname.split('/').slice(-3);
    // Computed per-request (not at module load) so the ETA stays a few minutes
    // ahead of "now" no matter how long the preceding web export/build took.
    const futureEta = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    route.fulfill(
      jsonFulfill({
        type: 'ETA',
        version: '1',
        generated_timestamp: NOW,
        data: [
          {
            route: routeCode,
            dir: 'O',
            service_type: svcType,
            dest_en: 'CAUSEWAY BAY',
            dest_tc: '銅鑼灣',
            dest_sc: '铜锣湾',
            eta: futureEta,
            data_timestamp: NOW,
          },
        ],
      })
    );
  });
}
