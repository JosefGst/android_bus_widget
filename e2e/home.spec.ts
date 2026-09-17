import { expect, test } from '@playwright/test';
import { mockKmbApi, MOCK_ROUTES } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test('home screen lists routes fetched from the API', async ({ page }) => {
  await page.goto('/');

  for (const r of MOCK_ROUTES) {
    await expect(page.getByText(`${r.orig_en} → ${r.dest_en}`)).toBeVisible();
  }
});

test('searching filters the route list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('TUEN MUN → CENTRAL')).toBeVisible();

  await page.getByPlaceholder('Search by route, origin, or destination...').fill('967');

  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toHaveCount(0);
  await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toHaveCount(0);
});
