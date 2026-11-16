import { expect, test } from '@playwright/test';
import { mockKmbApi, routeButton, saveStop } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test('saving a stop adds it to My Buses with a live ETA', async ({ page }) => {
  await page.goto('/find_route');

  // Home -> pick a route -> Routes Stop screen.
  await routeButton(page, '272P').click();
  await expect(page.getByRole('heading', { name: 'Route: 272P' })).toBeVisible();

  await saveStop(page, 'Causeway Bay Station');

  await page.getByRole('tab', { name: 'My Buses' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
  const row = page.getByRole('button', { name: /^Open 272P at Causeway Bay Station/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Causeway Bay', { exact: true })).toBeVisible();
  await expect(row).toHaveAccessibleName(/To Causeway Bay, \d+ min/);
  await expect(row.getByText(/^\d+$/)).toBeVisible();
});

// Route 967 is not a starter Favorite, so its row and delete button are unambiguous.
async function save967(page: import('@playwright/test').Page) {
  await routeButton(page, '967').click();
  await expect(page.getByRole('heading', { name: 'Route: 967' })).toBeVisible();
  await saveStop(page, 'Causeway Bay Station');
  await page.getByRole('tab', { name: 'My Buses' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
}

async function remove967(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Change my buses' }).click();
  await page.getByRole('button', { name: 'Remove 967 at Causeway Bay Station' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
}

test('saving again a Favorite that was just removed brings it back', async ({ page }) => {
  await page.goto('/find_route');
  await save967(page);
  const row = page.getByRole('button', { name: /^Open 967 at Causeway Bay Station/ });
  await expect(row).toBeVisible();

  await remove967(page);
  await expect(row).toHaveCount(0);

  // Go back to the same Stop list via Home and save the same Stop again.
  await page.getByRole('tab', { name: 'Find a Route' }).click();
  await save967(page);
  await expect(row).toBeVisible();
});

test('a removed Favorite stays removed after reloading the page', async ({ page }) => {
  await page.goto('/find_route');
  await save967(page);
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
  await expect(page.getByRole('heading', { name: 'Route: N29' })).toBeVisible();
  await saveStop(page, 'Jordan Map Stop');
  await page.getByRole('tab', { name: 'My Buses' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();

  // Show another Route first, so opening the Favorite loads N29's Stop list from scratch.
  await page.getByRole('tab', { name: 'Find a Route' }).click();
  await routeButton(page, '967').click();
  await expect(page.getByRole('heading', { name: 'Route: 967' })).toBeVisible();
  await page.getByRole('tab', { name: 'My Buses' }).click();
  // A short window puts Stop 3 below the fold, so the preselected Stop must be scrolled into view.
  await page.setViewportSize({ width: 390, height: 520 });
  await page.getByRole('button', { name: /^Open N29 at Jordan Map Stop/ }).click();

  await expect(page.getByRole('heading', { name: 'Route: N29' })).toBeVisible();
  // Only the Favorite's Stop is open, it is in view, and it is already saved.
  await expect(page.getByText('Next bus', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Next bus', { exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Saved to My Buses' })).toBeVisible();
  // The map shows the same Stop selected.
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
    await page.goto('/find_route');
    await routeButton(page, route).click();
    await saveStop(page, 'Causeway Bay Station');
  }
  await page.getByRole('tab', { name: 'My Buses' }).click();

  await page.getByRole('button', { name: /^Open 272P at Causeway Bay Station/ }).click();
  await expect(page.getByRole('heading', { name: 'Route: 272P' })).toBeVisible();
  await expect(page.getByText('Next bus', { exact: true })).toHaveCount(1);
  await page.getByRole('tab', { name: 'My Buses' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();

  // The ETA for 272X must be requested, not served from 272P's cached Stop ETAs.
  const etaRequest = page.waitForRequest(/\/eta\/MOCKSTOP001\/272X\/1/);
  await page.getByRole('button', { name: /^Open 272X at Causeway Bay Station/ }).click();
  await etaRequest;
  await expect(page.getByRole('heading', { name: 'Route: 272X' })).toBeVisible();
  await expect(page.getByText('Next bus', { exact: true })).toHaveCount(1);
});

test('opening the same Favorite again selects its Stop again and fetches fresh times', async ({ page }) => {
  let etaRequests = 0;
  page.on('request', request => {
    if (request.url().includes('/v1/transport/kmb/eta/') && request.url().includes('/N29/')) etaRequests++;
  });
  await page.goto('/routes_stop?route=N29&bound=O&service_type=1');
  await saveStop(page, 'Jordan Map Stop');
  await page.getByRole('tab', { name: 'My Buses' }).click();
  const openFavorite = () => page.getByRole('button', { name: /^Open N29 at Jordan Map Stop/ }).click();
  const nextBus = page.getByText('Next bus', { exact: true });

  await openFavorite();
  await expect(nextBus).toBeVisible();
  // Close the Stop's card, then leave and open the same Favorite again.
  await page.getByRole('button', { name: '3, Jordan Map Stop', exact: true }).click();
  await expect(nextBus).toHaveCount(0);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
  const before = etaRequests;
  await openFavorite();

  await expect(nextBus).toBeVisible();
  await expect.poll(() => etaRequests).toBeGreaterThan(before);
});
