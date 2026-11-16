import { expect, Page, test } from '@playwright/test';
import { MAP_ROUTE, mockKmbApi, routeButton } from './mocks';

const languageButton = (page: Page) => page.getByTestId('language-button');
const map = (page: Page) => page.frameLocator('iframe[title="路線地圖"]');
const tab = (page: Page, name: string) => page.getByRole('tab', { name });
const result = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await mockKmbApi(page);
});

test.describe('on an English phone', () => {
  test.use({ locale: 'en-US' });

  test('starts in English', async ({ page }) => {
    await page.goto('/find_route');
    await expect(routeButton(page, '272P')).toBeVisible();
    await expect(languageButton(page)).toHaveText('EN');
    await expect(tab(page, 'Find a Route')).toBeVisible();
  });

  test('the button cycles English, Traditional, Simplified and back', async ({ page }) => {
    await page.goto('/find_route');
    await expect(routeButton(page, '272P')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('繁');
    await expect(result(page, '272P，由屯門往銅鑼灣')).toBeVisible();
    await expect(tab(page, '搜尋路線')).toBeVisible();
    await expect(tab(page, '我的巴士')).toBeVisible();
    await expect(page.getByLabel('巴士號碼')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('简');
    await expect(result(page, '272P，由屯门往铜锣湾')).toBeVisible();
    await expect(tab(page, '搜索路线')).toBeVisible();

    await languageButton(page).click();
    await expect(languageButton(page)).toHaveText('EN');
    await expect(routeButton(page, '272P')).toBeVisible();
  });

  test('the choice survives a reload', async ({ page }) => {
    await page.goto('/find_route');
    await languageButton(page).click();
    await expect(result(page, '272P，由屯門往銅鑼灣')).toBeVisible();

    await page.reload();
    await expect(result(page, '272P，由屯門往銅鑼灣')).toBeVisible();
    await expect(languageButton(page)).toHaveText('繁');
  });

  test('Routes Stop shows Stop names, markers and map labels in Chinese', async ({ page }) => {
    const labelTiles: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/label/hk/')) labelTiles.push(request.url());
    });

    await page.goto('/find_route');
    await languageButton(page).click();
    await result(page, 'N29，由旺角往荃灣').click();

    await expect(page.getByRole('heading', { name: `路線：${MAP_ROUTE}` })).toBeVisible();
    await expect(page.getByText('油麻地地圖站')).toBeVisible();
    await page.getByText('油麻地地圖站').click();
    await expect(page.getByText('下一班', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '收藏到我的巴士' })).toBeVisible();

    await expect(page.getByTestId('map-resize-handle')).toHaveAttribute('aria-label', /^地圖大小：三分之一/);
    await expect(map(page).getByText('地圖資料由地政總署提供')).toBeVisible();
    await expect(map(page).locator('.leaflet-marker-icon[title="油麻地地圖站"]')).toHaveCount(1);
    await expect.poll(() => labelTiles.some(url => url.includes('/label/hk/tc/'))).toBe(true);
    await expect(page.getByRole('button', { name: '整條路線' })).toBeVisible();
  });

  test('switching language with the map open swaps the map labels', async ({ page }) => {
    const labelTiles: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/label/hk/')) labelTiles.push(request.url());
    });

    await page.goto('/find_route');
    await routeButton(page, 'N29').click();
    await expect(page.frameLocator('iframe[title="Route map"]').getByText('Map information from Lands Department')).toBeVisible();

    await languageButton(page).click();
    await languageButton(page).click();
    await expect(page.frameLocator('iframe[title="路线地图"]').locator('.leaflet-marker-icon[title="油麻地地图站"]')).toHaveCount(1);
    await expect(page.frameLocator('iframe[title="路线地图"]').getByText('地图资料由地政总署提供')).toBeVisible();
    await expect.poll(() => labelTiles.some(url => url.includes('/label/hk/sc/'))).toBe(true);
  });

  test('My Buses shows Stop names, destinations and arrivals in Chinese', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Default Stop One', { exact: true })).toBeVisible();

    await languageButton(page).click();
    await expect(page.getByRole('heading', { name: '我的巴士' })).toBeVisible();
    await expect(page.getByText('預設車站一', { exact: true })).toBeVisible();
    await expect(page.getByText('銅鑼灣', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('分鐘', { exact: true }).first()).toBeVisible();
  });

  test('My Buses says when it was updated as a 12-hour Hong Kong time', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/^Updated \d{1,2}:\d\d [ap]m$/)).toBeVisible();

    await languageButton(page).click();
    await expect(page.getByText(/^更新時間：[上下]午\d{1,2}:\d\d$/)).toBeVisible();
  });
});

test.describe('on a Hong Kong Chinese phone', () => {
  test.use({ locale: 'zh-HK' });

  test('starts in Traditional Chinese without a tap', async ({ page }) => {
    await page.goto('/find_route');
    await expect(result(page, '272P，由屯門往銅鑼灣')).toBeVisible();
    await expect(languageButton(page)).toHaveText('繁');
  });
});

test.describe('on a mainland Chinese phone', () => {
  test.use({ locale: 'zh-CN' });

  test('starts in Simplified Chinese without a tap', async ({ page }) => {
    await page.goto('/find_route');
    await expect(result(page, '272P，由屯门往铜锣湾')).toBeVisible();
    await expect(languageButton(page)).toHaveText('简');
  });
});
