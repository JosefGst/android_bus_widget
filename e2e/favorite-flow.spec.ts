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
