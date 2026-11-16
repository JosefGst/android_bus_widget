import { expect, Page, test } from '@playwright/test';
import { mockKmbApi, routeButton } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

const key = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const busNumber = (page: Page) => page.getByLabel('Bus number');

test('Find a Route lists every route with its start and end in words', async ({ page }) => {
  await page.goto('/find_route');
  await expect(page.getByRole('heading', { name: 'Find a Route' })).toBeVisible();

  await expect(routeButton(page, '272P')).toHaveAccessibleName('272P, from Tuen Mun to Causeway Bay');
  await expect(routeButton(page, '272P').getByText('To Causeway Bay')).toBeVisible();
  for (const route of ['272X', '967', 'N29']) await expect(routeButton(page, route)).toBeVisible();
  await expect(page.getByText(/Generated Timestamp/)).toHaveCount(0);
});

test('typing in the bus number box narrows the list and says how many match', async ({ page }) => {
  await page.goto('/find_route');
  await expect(routeButton(page, '272X')).toBeVisible();

  await busNumber(page).fill('967');

  await expect(routeButton(page, '967')).toBeVisible();
  await expect(routeButton(page, '272X')).toHaveCount(0);
  await expect(page.getByText('1 route matches “967”')).toBeVisible();
});

test('number keys type digits, Delete removes one, Clear empties the box', async ({ page }) => {
  await page.goto('/find_route');
  await expect(routeButton(page, '272X')).toBeVisible();

  await key(page, '2').click();
  await key(page, '7').click();
  await expect(busNumber(page)).toHaveValue('27');
  await expect(page.getByText('2 routes match “27”')).toBeVisible();
  await expect(routeButton(page, '967')).toHaveCount(0);

  await key(page, 'Delete').click();
  await expect(busNumber(page)).toHaveValue('2');

  await key(page, 'Clear').click();
  await expect(busNumber(page)).toHaveValue('');
  await expect(routeButton(page, '967')).toBeVisible();
});

test('letter keys only offer letters that can come next', async ({ page }) => {
  await page.goto('/find_route');
  await expect(routeButton(page, '272X')).toBeVisible();

  // Nothing typed: only letters that start a route (N29).
  await expect(key(page, 'N')).toBeVisible();
  await expect(key(page, 'P')).toHaveCount(0);

  for (const digit of ['2', '7', '2']) await key(page, digit).click();
  await expect(key(page, 'P')).toBeVisible();
  await expect(key(page, 'X')).toBeVisible();
  await expect(key(page, 'N')).toHaveCount(0);

  await key(page, 'X').click();
  await expect(routeButton(page, '272X')).toBeVisible();
  await expect(routeButton(page, '272P')).toHaveCount(0);
  // "272X" is complete, so no letter can follow.
  await expect(key(page, 'P')).toHaveCount(0);
});

test('a letter-led route can be typed with the letter key then digits', async ({ page }) => {
  await page.goto('/find_route');
  await key(page, 'N').click();
  await expect(routeButton(page, 'N29')).toBeVisible();
  await expect(routeButton(page, '272X')).toHaveCount(0);
  await key(page, '2').click();
  await key(page, '9').click();
  await expect(busNumber(page)).toHaveValue('N29');
  await expect(routeButton(page, 'N29')).toBeVisible();
});

test('tapping a result opens that route', async ({ page }) => {
  await page.goto('/find_route');
  await routeButton(page, '967').click();
  await expect(page.getByRole('heading', { name: 'Route: 967' })).toBeVisible();
});

test('when the routes fail to load, Try again loads them', async ({ page }) => {
  let refusals = 1;
  await page.route('https://data.etabus.gov.hk/v1/transport/kmb/route', async route => {
    if (refusals-- > 0) return route.fulfill({ status: 403, body: 'Forbidden' });
    return route.fallback();
  });
  await page.goto('/find_route');

  await expect(page.getByText("Couldn't load the bus routes.", { exact: false })).toBeVisible();
  await expect(page.getByText('No routes found.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(routeButton(page, '272P')).toBeVisible();
});
