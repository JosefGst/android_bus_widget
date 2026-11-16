import { expect, Page, test } from '@playwright/test';
import { LONG_ROUTE, MAP_ROUTE, mockKmbApi } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
  await page.goto(`/routes_stop?route=${MAP_ROUTE}&bound=O&service_type=1`);
  await expect(page.getByRole('heading', { name: `Route: ${MAP_ROUTE}` })).toBeVisible();
});

const map = (page: Page) => page.frameLocator('iframe[title="Route map"]');
const pin = (page: Page, seq: number) => map(page).locator('.stop-pin', { hasText: new RegExp(`^${seq}$`) });
const stopRow = (page: Page, seq: number, name: string) => page.getByRole('button', { name: `${seq}, ${name}`, exact: true });
const showMap = (page: Page) => page.getByRole('button', { name: 'Map', exact: true }).click();
const showList = (page: Page) => page.getByRole('button', { name: 'Stop list', exact: true }).click();
const nextBus = (page: Page) => page.getByText('Next bus', { exact: true });

test('shows the route with its start and end in words, and opens on the stop list', async ({ page }) => {
  const header = page.getByRole('heading', { name: `Route: ${MAP_ROUTE}` });
  await expect(header.getByText('From Mong Kok')).toBeVisible();
  await expect(header.getByText('To Tsuen Wan')).toBeVisible();
  await expect(page.getByText(/Direction: O/)).toHaveCount(0);
  await expect(stopRow(page, 1, 'Mong Kok Map Stop')).toBeVisible();
  await expect(page.locator('iframe[title="Route map"]')).toHaveCount(0);
});

test('tapping a stop shows its next buses and a Save button; one stop at a time', async ({ page }) => {
  await stopRow(page, 3, 'Jordan Map Stop').click();
  await expect(nextBus(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to My Buses' })).toBeVisible();

  await stopRow(page, 2, 'Yau Ma Tei Map Stop').click();
  await expect(nextBus(page)).toHaveCount(1);
});

test('tapping the open stop again closes it', async ({ page }) => {
  await stopRow(page, 2, 'Yau Ma Tei Map Stop').click();
  await expect(nextBus(page)).toBeVisible();
  await stopRow(page, 2, 'Yau Ma Tei Map Stop').click();
  await expect(nextBus(page)).toHaveCount(0);
});

test('the map shows one numbered marker per stop', async ({ page }) => {
  await showMap(page);
  await expect(map(page).locator('.stop-pin')).toHaveText(['1', '2', '3']);
  await expect(map(page).getByText('Map information from Lands Department')).toBeVisible();
});

test('tapping a marker selects the stop and shows its next buses under the map', async ({ page }) => {
  await showMap(page);
  await pin(page, 3).click();
  await expect(pin(page, 3)).toHaveClass(/selected/);
  await expect(nextBus(page)).toBeVisible();
  await expect(page.getByText('Jordan Map Stop', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save to My Buses' })).toBeVisible();
});

test('switching between list and map keeps the selected stop', async ({ page }) => {
  await stopRow(page, 1, 'Mong Kok Map Stop').click();
  await showMap(page);
  await expect(pin(page, 1)).toHaveClass(/selected/);

  await showList(page);
  await expect(page.locator('iframe[title="Route map"]')).toHaveCount(0);
  await expect(nextBus(page)).toBeVisible();
});

test('Whole route fits all stops back into view after zooming to one', async ({ page }) => {
  await showMap(page);
  await pin(page, 1).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
  // Selecting zooms in on Stop 1, which pushes the other Stops out of the map's view.
  await expect(pin(page, 3)).not.toBeInViewport();

  await page.getByRole('button', { name: 'Whole route' }).click();

  for (const seq of [1, 2, 3]) await expect(pin(page, seq)).toBeInViewport();
  await expect(pin(page, 1)).toHaveClass(/selected/);
});

test('Save to My Buses saves the stop without leaving the screen', async ({ page }) => {
  await stopRow(page, 2, 'Yau Ma Tei Map Stop').click();
  await page.getByRole('button', { name: 'Save to My Buses' }).click();

  await expect(page.getByRole('button', { name: 'Saved to My Buses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: `Route: ${MAP_ROUTE}` })).toBeVisible();

  await page.getByRole('tab', { name: 'My Buses' }).click();
  await expect(page.getByRole('button', { name: /^Open N29 at Yau Ma Tei Map Stop/ })).toBeVisible();
});

test('opening a second stop scrolls to its card, not past it', async ({ page }) => {
  // The first stop's card closes as the second opens; the scroll must use the list's new layout.
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto(`/routes_stop?route=${LONG_ROUTE}&bound=O&service_type=1`);
  await stopRow(page, 1, 'Long Stop 1').click();
  await expect(nextBus(page)).toBeInViewport();

  await stopRow(page, 5, 'Long Stop 5').click();
  await expect(stopRow(page, 5, 'Long Stop 5')).toBeInViewport();
  await expect(nextBus(page)).toBeInViewport();
});
