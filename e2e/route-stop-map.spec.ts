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
const mapArea = (page: Page) => page.getByTestId('route-map');
const handle = (page: Page) => page.getByTestId('map-resize-handle');
const mapHeight = async (page: Page) => (await mapArea(page).boundingBox())?.height ?? 0;
// The map's share of the area below the header (map + handle + Stop list).
const mapShare = async (page: Page) => {
  const map = await mapArea(page).boundingBox();
  const content = await page.getByTestId('route-content').boundingBox();
  return map && content ? map.height / content.height : 0;
};
const nextBus = (page: Page) => page.getByText('Next bus', { exact: true });

test('shows the route with its start and end in words, with the map above the stop list', async ({ page }) => {
  const header = page.getByRole('heading', { name: `Route: ${MAP_ROUTE}` });
  await expect(header.getByText('From Mong Kok')).toBeVisible();
  await expect(header.getByText('To Tsuen Wan')).toBeVisible();
  await expect(page.getByText(/Direction: O/)).toHaveCount(0);
  await expect(stopRow(page, 1, 'Mong Kok Map Stop')).toBeVisible();
  await expect(page.locator('iframe[title="Route map"]')).toBeVisible();
  // No switch between list and map any more: both are always on screen.
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop list', exact: true })).toHaveCount(0);
});

test('the map opens at a third of the screen below the header', async ({ page }) => {
  await expect.poll(() => mapShare(page)).toBeCloseTo(1 / 3, 1);
});

test('tapping the handle steps the map through a third, half and large, then back', async ({ page }) => {
  for (const share of [1 / 2, 0.85, 1 / 3]) {
    await handle(page).click();
    await expect.poll(() => mapShare(page)).toBeCloseTo(share, 1);
  }
});

test('dragging the handle resizes the map and snaps to the nearest size', async ({ page }) => {
  const box = await handle(page).boundingBox();
  const content = await page.getByTestId('route-content').boundingBox();
  if (!box || !content) throw new Error('handle or content not laid out');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Drag down by 0.2 of the area: a third + 0.2 = 0.53, nearest size is half.
  await page.mouse.move(x, y + content.height * 0.1, { steps: 5 });
  await page.mouse.move(x, y + content.height * 0.2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => mapShare(page)).toBeCloseTo(1 / 2, 1);
});

test('the map size is remembered', async ({ page }) => {
  await handle(page).click();
  await expect.poll(() => mapShare(page)).toBeCloseTo(1 / 2, 1);
  await page.reload();
  await expect(page.getByRole('heading', { name: `Route: ${MAP_ROUTE}` })).toBeVisible();
  await expect.poll(() => mapShare(page)).toBeCloseTo(1 / 2, 1);
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
  await expect(map(page).locator('.stop-pin')).toHaveText(['1', '2', '3']);
  await expect(map(page).getByText('Map information from Lands Department')).toBeVisible();
});

test('tapping a marker opens that stop in the list; the map keeps its size', async ({ page }) => {
  await expect.poll(() => mapHeight(page)).toBeGreaterThan(0);
  const before = await mapHeight(page);
  await pin(page, 3).click();
  await expect(pin(page, 3)).toHaveClass(/selected/);
  await expect(nextBus(page)).toBeInViewport();
  await expect(stopRow(page, 3, 'Jordan Map Stop')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Save to My Buses' })).toBeVisible();
  expect(await mapHeight(page)).toBeCloseTo(before, 0);
});

test('tapping a stop in the list highlights its marker', async ({ page }) => {
  await stopRow(page, 1, 'Mong Kok Map Stop').click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
  await expect(nextBus(page)).toBeVisible();
});

test('Whole route fits all stops back into view after zooming to one', async ({ page }) => {
  await pin(page, 1).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
  // Selecting zooms in on Stop 1, which pushes the other Stops out of the map's view.
  await expect(pin(page, 3)).not.toBeInViewport();

  await page.getByRole('button', { name: 'Whole route' }).click();

  for (const seq of [1, 2, 3]) await expect(pin(page, seq)).toBeInViewport();
  await expect(pin(page, 1)).toHaveClass(/selected/);
});

test('Save to My Buses saves the stop and returns to My Buses', async ({ page }) => {
  await stopRow(page, 2, 'Yau Ma Tei Map Stop').click();
  await page.getByRole('button', { name: 'Save to My Buses' }).click();

  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
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

test('map pins use the app colours: white with a dark ring, the selected one in the accent blue', async ({ page }) => {
  const style = (seq: number) => pin(page, seq).evaluate(el => {
    const s = getComputedStyle(el);
    return { background: s.backgroundColor, border: s.borderTopColor, text: s.color };
  });
  await expect.poll(() => style(1)).toEqual({ background: 'rgb(255, 255, 255)', border: 'rgb(20, 23, 31)', text: 'rgb(20, 23, 31)' });

  await pin(page, 1).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
  await expect.poll(() => style(1)).toEqual({ background: 'rgb(10, 79, 191)', border: 'rgb(255, 255, 255)', text: 'rgb(255, 255, 255)' });
});
