import { expect, Page, test } from '@playwright/test';
import { MAP_ROUTE, mockKmbApi } from './mocks';

const languageButton = (page: Page) => page.getByTestId('language-button');
const map = (page: Page) => page.frameLocator('iframe[title="路線地圖"]');
const tab = (page: Page, name: string) => page.getByRole('tab', { name });

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test.describe('on an English phone', () => {
  test.use({ locale: 'en-US' });

  test('starts in English', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toBeVisible();
    await expect(languageButton(page)).toHaveText('EN');
    await expect(tab(page, 'Home')).toBeVisible();
  });

  test('the button cycles English, Traditional, Simplified and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('繁');
    await expect(page.getByText('屯門 → 銅鑼灣')).toBeVisible();
    await expect(tab(page, '主頁')).toBeVisible();
    await expect(tab(page, '路線車站')).toBeVisible();
    await expect(tab(page, '我的最愛')).toBeVisible();
    await expect(page.getByPlaceholder('輸入路線號碼…')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('简');
    await expect(page.getByText('屯门 → 铜锣湾')).toBeVisible();
    await expect(tab(page, '我的收藏')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('EN');
    await expect(page.getByText('TUEN MUN → CAUSEWAY BAY')).toBeVisible();
  });

  test('the choice survives a reload', async ({ page }) => {
    await page.goto('/');
    await languageButton(page).click();
    await expect(page.getByText('屯門 → 銅鑼灣')).toBeVisible();

    await page.reload();
    await expect(page.getByText('屯門 → 銅鑼灣')).toBeVisible();
    await expect(languageButton(page)).toHaveText('繁');
  });

  test('Routes Stop shows Stop names, markers and map labels in Chinese', async ({ page }) => {
    const labelTiles: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/label/hk/')) labelTiles.push(request.url());
    });

    await page.goto('/');
    await languageButton(page).click();
    await page.getByText('旺角 → 荃灣').click();

    await expect(page.getByText(`路線：${MAP_ROUTE}`)).toBeVisible();
    await expect(page.getByText('油麻地地圖站')).toBeVisible();
    await expect(map(page).getByText('地圖資料由地政總署提供')).toBeVisible();
    await expect(map(page).locator('.leaflet-marker-icon[title="油麻地地圖站"]')).toHaveCount(1);
    await expect.poll(() => labelTiles.some(url => url.includes('/label/hk/tc/'))).toBe(true);
    await expect(page.getByRole('button', { name: '隱藏地圖' })).toBeVisible();

    await page.getByText('油麻地地圖站').click();
    await expect(page.getByText(/\d+ 分鐘後到達/)).toBeVisible();
  });

  test('switching language with the map open swaps the map labels', async ({ page }) => {
    const labelTiles: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/label/hk/')) labelTiles.push(request.url());
    });

    await page.goto('/');
    await page.getByText('MONG KOK → TSUEN WAN').click();
    await expect(page.frameLocator('iframe[title="Route map"]').getByText('Map information from Lands Department')).toBeVisible();

    await languageButton(page).click();
    await languageButton(page).click();
    await expect(page.getByText('油麻地地图站')).toBeVisible();
    await expect(page.frameLocator('iframe[title="路线地图"]').getByText('地图资料由地政总署提供')).toBeVisible();
    await expect.poll(() => labelTiles.some(url => url.includes('/label/hk/sc/'))).toBe(true);
  });

  test('My Favorites shows Stop names and arrivals in Chinese', async ({ page }) => {
    await page.goto('/my_favorites');
    await expect(page.getByText('Default Stop One', { exact: true })).toBeVisible();

    await languageButton(page).click();
    await expect(page.getByText('預設車站一', { exact: true })).toBeVisible();
    await expect(page.getByText('我的路線')).toBeVisible();
    await expect(page.getByText(/272P \d+ 分鐘後到達/).first()).toBeVisible();
  });
});

test.describe('on a Hong Kong Chinese phone', () => {
  test.use({ locale: 'zh-HK' });

  test('starts in Traditional Chinese without a tap', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('屯門 → 銅鑼灣')).toBeVisible();
    await expect(languageButton(page)).toHaveText('繁');
  });
});

test.describe('on a mainland Chinese phone', () => {
  test.use({ locale: 'zh-CN' });

  test('starts in Simplified Chinese without a tap', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('屯门 → 铜锣湾')).toBeVisible();
    await expect(languageButton(page)).toHaveText('简');
  });
});
