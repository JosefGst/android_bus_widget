import { expect, test } from '@playwright/test';
import { MAP_ROUTE, mockKmbApi } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
  await page.goto(`/routes_stop?route=${MAP_ROUTE}&bound=O&service_type=1`);
  await expect(page.getByText(`Route: ${MAP_ROUTE}`)).toBeVisible();
});

const map = (page: import('@playwright/test').Page) => page.frameLocator('iframe[title="Route map"]');
const pin = (page: import('@playwright/test').Page, seq: number) =>
  map(page).locator('.stop-pin', { hasText: new RegExp(`^${seq}$`) });

test('shows one numbered marker per Stop of the Route', async ({ page }) => {
  await expect(map(page).locator('.stop-pin')).toHaveText(['1', '2', '3']);
  await expect(map(page).getByText('Map information from Lands Department')).toBeVisible();
});

test('tapping a marker highlights it and expands its row with the ETA', async ({ page }) => {
  await pin(page, 3).click();
  await expect(pin(page, 3)).toHaveClass(/selected/);
  await expect(page.getByText(/arrives in \d+ minutes/)).toBeVisible();
  // Only the tapped Stop is expanded.
  await expect(page.getByText(/arrives in/)).toHaveCount(1);
});

test('tapping a row highlights its marker; tapping it again clears it', async ({ page }) => {
  await expect(pin(page, 2)).toBeVisible();
  await page.getByText('Yau Ma Tei Map Stop').click();
  await expect(pin(page, 2)).toHaveClass(/selected/);

  await page.getByText('Yau Ma Tei Map Stop').click();
  await expect(map(page).locator('.stop-pin.selected')).toHaveCount(0);
  await expect(page.getByText(/arrives in/)).toHaveCount(0);
});

test('hiding and showing the map keeps the selected Stop', async ({ page }) => {
  await pin(page, 1).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);

  await page.getByRole('button', { name: 'Hide map' }).click();
  await expect(page.locator('iframe[title="Route map"]')).toHaveCount(0);
  await expect(page.getByText(/arrives in/)).toBeVisible();

  await page.getByRole('button', { name: 'Show map' }).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
});

const handle = (page: import('@playwright/test').Page) => page.getByTestId('map-resize-handle');

const dragHandle = async (page: import('@playwright/test').Page, dy: number): Promise<void> => {
  const box = await handle(page).boundingBox();
  if (!box) throw new Error('resize handle not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.move(x, y + dy, { steps: 20 });
  await page.waitForTimeout(50);
  await page.mouse.up();
};

test('dragging the handle snaps the map to half and large, and the size is remembered', async ({ page }) => {
  const iframe = page.locator('iframe[title="Route map"]');
  await expect(handle(page)).toHaveAccessibleName('Resize map, small');
  // Measure once the screen has laid out (markers drawn).
  await expect(map(page).locator('.stop-pin')).toHaveCount(3);
  const small = (await iframe.boundingBox())?.height ?? 0;
  const area = page.viewportSize()?.height ?? 0;

  await dragHandle(page, area / 6);
  await expect(handle(page)).toHaveAccessibleName('Resize map, half');
  await dragHandle(page, area * 0.3);
  await expect(handle(page)).toHaveAccessibleName('Resize map, large');
  await expect.poll(async () => (await iframe.boundingBox())?.height ?? 0).toBeGreaterThan(small * 2);
  // The page still draws its tiles after resizing.
  await expect(map(page).getByText('Map information from Lands Department')).toBeVisible();

  await page.reload();
  await expect(handle(page)).toHaveAccessibleName('Resize map, large');
});

test('tapping a marker grows a small map to half', async ({ page }) => {
  await expect(handle(page)).toHaveAccessibleName('Resize map, small');
  await pin(page, 2).click();
  await expect(handle(page)).toHaveAccessibleName('Resize map, half');
});

test('Show route fits all Stops back into view after zooming to one', async ({ page }) => {
  await pin(page, 1).click();
  await expect(pin(page, 1)).toHaveClass(/selected/);
  // Selecting zooms in on Stop 1, which pushes the other Stops out of the map's view.
  await expect(pin(page, 3)).not.toBeInViewport();

  await page.getByRole('button', { name: 'Show route' }).click();

  for (const seq of [1, 2, 3]) await expect(pin(page, seq)).toBeInViewport();
  // The selection is kept.
  await expect(pin(page, 1)).toHaveClass(/selected/);
});
