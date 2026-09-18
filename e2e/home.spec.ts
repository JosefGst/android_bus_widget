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

  await page.getByPlaceholder('Search by route number...').fill('967');

  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toHaveCount(0);
  await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toHaveCount(0);
});

test('numeric keypad enters digits and backspace removes them', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('TUEN MUN → CENTRAL')).toBeVisible();

  await page.getByText('9', { exact: true }).click();
  await page.getByText('6', { exact: true }).click();
  await page.getByText('7', { exact: true }).click();

  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toHaveCount(0);

  await page.getByText('⌫', { exact: true }).click();
  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toHaveCount(0);

  await page.getByText('Clear', { exact: true }).click();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toBeVisible();
});

test('letter keypad only offers letters that can follow the typed digits', async ({ page }) => {
  await page.goto('/');

  // Before typing anything, no letter is a valid next key for these routes
  // other than the initial letters of routes that start with one (N29).
  await expect(page.getByText('P', { exact: true })).toHaveCount(0);
  await expect(page.getByText('X', { exact: true })).toHaveCount(0);

  await page.getByText('2', { exact: true }).click();
  await page.getByText('7', { exact: true }).click();
  await page.getByText('2', { exact: true }).click();

  // "272" is a prefix of 272P and 272X, so only P and X should be offered.
  await expect(page.getByText('P', { exact: true })).toBeVisible();
  await expect(page.getByText('X', { exact: true })).toBeVisible();
  await expect(page.getByText('N', { exact: true })).toHaveCount(0);

  await page.getByText('X', { exact: true }).click();

  await expect(page.getByText('TUEN MUN → CENTRAL')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toHaveCount(0);
  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toHaveCount(0);

  // "272X" is a full route code, so no further letter should be offered.
  await expect(page.getByText('P', { exact: true })).toHaveCount(0);

  await page.getByText('Clear', { exact: true }).click();
  await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toBeVisible();
});

test('letter keypad surfaces letter-led routes and combines with the numeric keypad', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('MONG KOK → TSUEN WAN')).toBeVisible();

  // With no digits typed, routes that start with a letter (N29) offer that letter.
  await expect(page.getByText('N', { exact: true })).toBeVisible();

  await page.getByText('N', { exact: true }).click();

  // The route-code prefix match narrows to N29 immediately, unlike a plain
  // substring search where "n" would also match names like "TUEN MUN".
  await expect(page.getByText('MONG KOK → TSUEN WAN')).toBeVisible();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toHaveCount(0);
  await expect(page.getByText('TIN SHUI WAI → ADMIRALTY')).toHaveCount(0);

  // The rest of "N29" is digits, so the letter keypad has nothing to offer now.
  await expect(page.getByText('X', { exact: true })).toHaveCount(0);

  await page.getByText('2', { exact: true }).click();
  await page.getByText('9', { exact: true }).click();
  await expect(page.getByText('MONG KOK → TSUEN WAN')).toBeVisible();

  await page.getByText('Clear', { exact: true }).click();
  await expect(page.getByText('TUEN MUN → CENTRAL')).toBeVisible();
});
