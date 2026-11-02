// Référencement : balises essentielles présentes et cohérentes sur chaque page.
const { test, expect } = require('@playwright/test');

for (const path of ['multiplication/', 'multiplication/aventure/', 'multiplication/etoiles/']) {
  test(`balises SEO présentes : ${path} @smoke`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect((await page.title()).length).toBeGreaterThan(10);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(/^https:\/\/florito32\.github\.io\/minijeux\//);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('robots.txt et sitemap.xml accessibles @smoke', async ({ request, baseURL }) => {
  expect((await request.get(new URL('robots.txt', baseURL).href)).ok()).toBeTruthy();
  const sitemap = await request.get(new URL('sitemap.xml', baseURL).href);
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain('/multiplication/');
  expect(await sitemap.text()).toContain('/multiplication/aventure/');
});
