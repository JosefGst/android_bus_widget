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
