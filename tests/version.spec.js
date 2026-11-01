// Numéro de version visible + historique au clic.
const { test, expect } = require('@playwright/test');

test('affiche la version et ouvre l\'historique au clic @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const badge = page.locator('.version-badge');
  await badge.scrollIntoViewIfNeeded();
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/^v\d+\.\d+ — historique des versions$/);

  await badge.click();
  const dialog = page.getByRole('dialog', { name: 'Historique des versions' });
  await expect(dialog).toBeVisible();
  // La version affichée est bien la première entrée de l'historique.
  const version = (await badge.textContent()).match(/v\d+\.\d+/)[0];
  await expect(dialog.locator('.version-list > li').first().locator('h3')).toContainText(version);

  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(dialog).toBeHidden();
});
