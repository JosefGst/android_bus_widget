import { Page } from '@playwright/test';

// All app network calls go to this host; intercept them so tests are
// deterministic and don't depend on the live KMB API being up.
const API_HOST = 'https://data.etabus.gov.hk';

const NOW = new Date().toISOString();
const FUTURE_ETA = new Date(Date.now() + 5 * 60 * 1000).toISOString();

export const MOCK_ROUTES = [
  { route: '272P', bound: 'O', service_type: '1', orig_en: 'TUEN MUN', dest_en: 'CAUSEWAY BAY' },
  { route: '272X', bound: 'O', service_type: '1', orig_en: 'TUEN MUN', dest_en: 'CENTRAL' },
  { route: '967', bound: 'O', service_type: '1', orig_en: 'TIN SHUI WAI', dest_en: 'ADMIRALTY' },
];

export const MOCK_STOP_NAMES: Record<string, string> = {
  B464BD6334A93FA1: 'Default Stop One',
  B644204AEDE7A031: 'Default Stop Two',
  MOCKSTOP001: 'Causeway Bay Station',
};

const jsonFulfill = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

/** Install mocked responses for every KMB API endpoint the app calls. */
export async function mockKmbApi(page: Page) {
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
        data: Object.entries(MOCK_STOP_NAMES).map(([stop, name_en]) => ({ stop, name_en })),
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
        data: { stop: stopId, name_en: MOCK_STOP_NAMES[stopId] ?? 'Unknown Stop' },
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
        data: [
          {
            route: routeCode,
            bound: boundDir === 'inbound' ? 'I' : 'O',
            service_type: svcType,
            seq: '1',
            stop: 'MOCKSTOP001',
          },
        ],
      })
    );
  });

  // ETA for a stop+route: /eta/{stop}/{route}/{service_type}
  await page.route(`${API_HOST}/v1/transport/kmb/eta/*/*/*`, route => {
    const [stopId, routeCode, svcType] = new URL(route.request().url()).pathname.split('/').slice(-3);
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
            eta: FUTURE_ETA,
            data_timestamp: NOW,
          },
        ],
      })
    );
  });
}
