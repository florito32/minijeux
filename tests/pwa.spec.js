// PWA : manifeste valide, icônes présentes, service worker actif, page servie hors ligne.
const { test, expect } = require('@playwright/test');

test('manifeste et icônes accessibles @smoke', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(href, page.url()).href;
  const res = await request.get(manifestUrl);
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    expect((await request.get(new URL(icon.src, manifestUrl).href)).ok()).toBeTruthy();
  }
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(new URL(apple, page.url()).href)).ok()).toBeTruthy();
});

test('service worker actif et page disponible hors ligne', async ({ page, context }) => {
  await page.goto('multiplication/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // la page est maintenant contrôlée et mise en cache
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await context.setOffline(false);
});

test('le service worker couvre tout le site depuis un jeu', async ({ page }) => {
  await page.goto('multiplication/');
  const scope = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.scope));
  expect(new URL(scope).pathname).toBe(new URL('./', page.url()).pathname.replace(/multiplication\/$/, ''));
});
