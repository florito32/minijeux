// Parcours principal : jeu de multiplication + barre d'onglets + affichage sur chaque écran.
// Les tests marqués @smoke sont aussi rejoués sur la page en ligne.
const { test, expect } = require('@playwright/test');

// Lit la question affichée et renvoie le bon résultat.
async function bonneReponse(page) {
  const q = page.locator('[data-question]');
  return Number(await q.getAttribute('data-a')) * Number(await q.getAttribute('data-b'));
}

test('l\'accueil ouvre directement l\'onglet Multiplication @smoke', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/\/multiplication\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jeu de multiplication');
});

test('barre d\'onglets : l\'onglet Multiplication est actif @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const nav = page.getByRole('navigation', { name: 'Jeux' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: /Multiplication/ })).toHaveAttribute('aria-current', 'page');
});

test('bonne réponse : bravo, score +1, nouvelle question @smoke', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('multiplication/');
  const avant = await page.locator('[data-question]').textContent();
  expect(avant).toMatch(/^\d+ × \d+ = \?$/);
  await page.getByLabel('Ta réponse').fill(String(await bonneReponse(page)));
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('[data-feedback]')).toHaveText(/^Bravo/);
  await expect(page.locator('[data-score]')).toHaveText('1');
  await expect(page.locator('[data-total]')).toHaveText('1');
  await expect(page.locator('[data-question]')).not.toHaveText(avant);
  await expect(page.getByLabel('Ta réponse')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('mauvaise réponse : correction affichée, score inchangé', async ({ page }) => {
  await page.goto('multiplication/');
  const juste = await bonneReponse(page);
  await page.getByLabel('Ta réponse').fill(String(juste + 1));
  await page.getByLabel('Ta réponse').press('Enter'); // validation au clavier
  await expect(page.locator('[data-feedback]')).toHaveText(new RegExp(`Pas tout à fait.*= ${juste}$`));
  await expect(page.locator('[data-score]')).toHaveText('0');
  await expect(page.locator('[data-total]')).toHaveText('1');
});

test('réponse vide : message d\'aide, aucune question comptée', async ({ page }) => {
  await page.goto('multiplication/');
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.locator('[data-feedback]')).toHaveText('Écris un nombre, puis valide.');
  await expect(page.locator('[data-total]')).toHaveText('0');
});

test('les facteurs restent dans les tables de 1 à 10', async ({ page }) => {
  await page.goto('multiplication/');
  for (let i = 0; i < 20; i++) {
    const q = page.locator('[data-question]');
    for (const k of ['data-a', 'data-b']) {
      const n = Number(await q.getAttribute(k));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
    }
    await page.getByLabel('Ta réponse').fill('0');
    await page.getByLabel('Ta réponse').press('Enter');
  }
});

test('pas de défilement horizontal, question et bouton visibles @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('[data-question]')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Valider' })).toBeInViewport();
});
