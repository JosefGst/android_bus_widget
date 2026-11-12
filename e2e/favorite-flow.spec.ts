import { expect, test } from '@playwright/test';
import { mockKmbApi } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test('favoriting a stop adds it to My Favorites with a live ETA', async ({ page }) => {
  await page.goto('/');

  // Home -> pick a route -> Routes Stop screen.
  await page.getByText('TUEN MUN → CAUSEWAY BAY').click();
  await expect(page.getByText('Route: 272P')).toBeVisible();

  // Only one stop is mocked for this route, so its star button is unambiguous.
  await expect(page.getByText('Causeway Bay Station')).toBeVisible();
  await page.getByLabel('Favorite this stop').click();

  // Star tap saves the favorite and navigates to My Favorites.
  await expect(page.getByText('My Routes')).toBeVisible();
  await expect(page.getByText('272P (Causeway Bay Station)')).toBeVisible();
  // Both the default 272P stop and the newly favorited one produce this text; either confirms the ETA rendered.
  await expect(page.getByText(/272P will arrive in \d+ minutes/).first()).toBeVisible();
});

// Route 967 is not a starter Favorite, so its row and delete button are unambiguous.
async function star967(page: import('@playwright/test').Page) {
  await page.getByText('TIN SHUI WAI → ADMIRALTY').click();
  await expect(page.getByText('Route: 967')).toBeVisible();
  await expect(page.getByText('Causeway Bay Station')).toBeVisible();
  await page.getByLabel('Favorite this stop').click();
  await expect(page.getByText('My Routes')).toBeVisible();
}

test('re-starring a Favorite that was just removed brings it back', async ({ page }) => {
  await page.goto('/');
  await star967(page);
  const row = page.getByText('967 (Causeway Bay Station)');
  await expect(row).toBeVisible();

  await page.getByLabel('Remove route 967').click();
  await expect(row).toHaveCount(0);

  // Go back to the same Stop list via Home and star the same Stop again.
  await page.getByRole('tab', { name: 'Home' }).click();
  await star967(page);
  await expect(row).toBeVisible();
});

test('a removed Favorite stays removed after reloading the page', async ({ page }) => {
  await page.goto('/');
  await star967(page);
  const row = page.getByText('967 (Causeway Bay Station)');
  await expect(row).toBeVisible();

  await page.getByLabel('Remove route 967').click();
  await expect(row).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('My Routes')).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('tapping a Favorite row opens Routes Stop with that Stop selected', async ({ page }) => {
  await page.goto('/routes_stop?route=N29&bound=O&service_type=1');
  await expect(page.getByText('Route: N29')).toBeVisible();
  await expect(page.getByText('Jordan Map Stop')).toBeVisible();
  // Star the third Stop (rows are in order, so the third star is Jordan).
  await page.getByLabel('Favorite this stop').nth(2).click();
  await expect(page.getByText('My Routes')).toBeVisible();

  await page.getByRole('button', { name: 'Open N29 at Jordan Map Stop' }).click();

  await expect(page.getByText('Route: N29')).toBeVisible();
  // Only the Favorite's Stop is expanded, and its row is in view.
  await expect(page.getByText(/arrives in \d+ minutes/)).toHaveCount(1);
  await expect(page.getByText(/arrives in \d+ minutes/)).toBeInViewport();
  await expect(
    page.frameLocator('iframe[title="Route map"]').locator('.stop-pin.selected')
  ).toHaveText('3');

  // Back returns to My Favorites.
  await page.goBack();
  await expect(page.getByText('My Routes')).toBeVisible();
});
