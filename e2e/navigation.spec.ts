import { expect, test } from '@playwright/test';
import { mockKmbApi, routeButton } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test('the app opens on My Buses', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My Buses' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'My Buses' })).toHaveAttribute('aria-selected', 'true');
});

test('the tab bar has two tabs: My Buses first, then Find a Route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab')).toHaveText(['My Buses', 'Find a Route']);
});

test('Routes Stop opens from Find a Route as a page; its tab stays selected and Back returns to it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Find a Route' }).click();
  await routeButton(page, '967').click();

  await expect(page.getByRole('heading', { name: 'Route: 967' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: 'Find a Route' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Find a Route' })).toBeVisible();
});

test('Routes Stop opened from My Buses keeps My Buses selected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Open 272P at Default Stop One/ }).click();
  await expect(page.getByRole('heading', { name: 'Route: 272P' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'My Buses' })).toHaveAttribute('aria-selected', 'true');
});

test('the empty My Buses screen leads to Find a Route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change my buses' }).click();
  for (const name of [/^Remove 272P/, /^Remove 272X/]) await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Find a Route' }).click();
  await expect(page.getByRole('heading', { name: 'Find a Route' })).toBeVisible();
});

test('a cold start downloads the Route list once', async ({ page }) => {
  // Parallel downloads at start-up are the bursts that get the app refused (403) by the KMB CDN.
  let routeListRequests = 0;
  page.on('request', request => {
    if (request.url() === 'https://data.etabus.gov.hk/v1/transport/kmb/route') routeListRequests++;
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Find a Route' }).click();
  await expect(routeButton(page, '272P')).toBeVisible();
  await page.waitForTimeout(1000);
  expect(routeListRequests).toBe(1);
});

test('text uses Atkinson Hyperlegible, bold for headings', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'My Buses' });
  await expect(heading).toBeVisible();
  expect(await heading.evaluate(el => getComputedStyle(el).fontFamily)).toContain('AtkinsonHyperlegible_700Bold');
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px AtkinsonHyperlegible_700Bold');
  })).toBe(true);
});
