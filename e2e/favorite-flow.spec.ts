import { expect, test } from '@playwright/test';
import { mockKmbApi, routeButton } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test('saving a stop adds it to My Buses with a live ETA', async ({ page }) => {
  await page.goto('/');

  // Home -> pick a route -> Routes Stop screen.
  await routeButton(page, '272P').click();
  await expect(page.getByText('Route: 272P')).toBeVisible();

  // Only one stop is mocked for this route, so its star button is unambiguous.
  await expect(page.getByText('Causeway Bay Station')).toBeVisible();
  await page.getByLabel('Favorite this stop').click();

  // Star tap saves the favorite and navigates to My Buses.
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
  const row = page.getByRole('button', { name: /^Open 272P at Causeway Bay Station/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Causeway Bay', { exact: true })).toBeVisible();
  await expect(row).toHaveAccessibleName(/To Causeway Bay, \d+ min/);
  await expect(row.getByText(/^\d+$/)).toBeVisible();
});

// Route 967 is not a starter Favorite, so its row and delete button are unambiguous.
async function star967(page: import('@playwright/test').Page) {
  await routeButton(page, '967').click();
  await expect(page.getByText('Route: 967')).toBeVisible();
  await expect(page.getByText('Causeway Bay Station')).toBeVisible();
  await page.getByLabel('Favorite this stop').click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
}

async function remove967(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Change my buses' }).click();
  await page.getByRole('button', { name: 'Remove 967 at Causeway Bay Station' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
}

test('re-starring a Favorite that was just removed brings it back', async ({ page }) => {
  await page.goto('/');
  await star967(page);
  const row = page.getByRole('button', { name: /^Open 967 at Causeway Bay Station/ });
  await expect(row).toBeVisible();

  await remove967(page);
  await expect(row).toHaveCount(0);

  // Go back to the same Stop list via Home and star the same Stop again.
  await page.getByRole('tab', { name: 'Home' }).click();
  await star967(page);
  await expect(row).toBeVisible();
});

test('a removed Favorite stays removed after reloading the page', async ({ page }) => {
  await page.goto('/');
  await star967(page);
  const row = page.getByRole('button', { name: /^Open 967 at Causeway Bay Station/ });
  await expect(row).toBeVisible();

  await remove967(page);
  await expect(row).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: /^Open 272P at Default Stop One/ })).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('tapping a Favorite row opens Routes Stop with that Stop selected', async ({ page }) => {
  await page.goto('/routes_stop?route=N29&bound=O&service_type=1');
  await expect(page.getByText('Route: N29')).toBeVisible();
  await expect(page.getByText('Jordan Map Stop')).toBeVisible();
  // Star the third Stop (rows are in order, so the third star is Jordan).
  await page.getByLabel('Favorite this stop').nth(2).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();

  await page.getByRole('button', { name: /^Open N29 at Jordan Map Stop/ }).click();

  await expect(page.getByText('Route: N29')).toBeVisible();
  // Only the Favorite's Stop is expanded, and its row is in view.
  await expect(page.getByText(/arrives in \d+ minutes/)).toHaveCount(1);
  await expect(page.getByText(/arrives in \d+ minutes/)).toBeInViewport();
  await expect(
    page.frameLocator('iframe[title="Route map"]').locator('.stop-pin.selected')
  ).toHaveText('3');

  // The in-app Back button returns to My Buses (it follows the tab history, like Android's back button).
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
});

test('opening a second Favorite at the same Stop loads that Route, not the previous one', async ({ page }) => {
  // 272P and 272X are both mocked at Causeway Bay Station.
  for (const route of ['272P', '272X']) {
    await page.goto('/');
    await routeButton(page, route).click();
    await expect(page.getByText('Causeway Bay Station')).toBeVisible();
    await page.getByLabel('Favorite this stop').click();
    await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
  }

  await page.getByRole('button', { name: /^Open 272P at Causeway Bay Station/ }).click();
  await expect(page.getByText('Route: 272P')).toBeVisible();
  await expect(page.getByText(/arrives in \d+ minutes/)).toHaveCount(1);
  await page.getByRole('tab', { name: /My Buses/ }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();

  // The ETA for 272X must be requested, not served from 272P's cached Stop ETAs.
  const etaRequest = page.waitForRequest(/\/eta\/MOCKSTOP001\/272X\/1/);
  await page.getByRole('button', { name: /^Open 272X at Causeway Bay Station/ }).click();
  await etaRequest;
  await expect(page.getByText('Route: 272X')).toBeVisible();
  await expect(page.getByText(/arrives in \d+ minutes/)).toHaveCount(1);
});
