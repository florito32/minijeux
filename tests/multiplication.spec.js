// Parcours principal : jeu de plateforme des multiplications + barre d'onglets.
// Les tests marqués @smoke sont aussi rejoués sur la page en ligne.
const { test, expect } = require('@playwright/test');

const etat = (page) => page.evaluate(() => window.__jeu.etat());

// Ouvre le jeu et clique sur « Jouer ».
async function demarrer(page) {
  await page.goto('multiplication/');
  await page.getByRole('button', { name: 'Jouer' }).click();
  await expect.poll(async () => (await etat(page)).status).toBe('playing');
}

// Place le personnage sous la caisse i, attend qu'il soit posé, puis saute.
async function casser(page, i) {
  await page.evaluate((n) => window.__jeu.placerSous(n), i);
  await expect.poll(async () => (await etat(page)).player.onGround).toBe(true);
  await page.keyboard.down('Space');
  await expect.poll(async () => (await etat(page)).boxes[i].broken, { timeout: 3000 }).toBe(true);
  await page.keyboard.up('Space');
}

test('l\'accueil ouvre directement l\'onglet Multiplication @smoke', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveURL(/\/multiplication\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aventure des multiplications');
});

test('barre d\'onglets : l\'onglet Multiplication est actif @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const nav = page.getByRole('navigation', { name: 'Jeux' });
  await expect(nav.getByRole('link', { name: /Multiplication/ })).toHaveAttribute('aria-current', 'page');
});

test('le nombre à trouver est affiché sous le jeu et 1 caisse sur 3 lui correspond @smoke', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('multiplication/');
  const s = await etat(page);
  await expect(page.locator('[data-target]')).toHaveText(String(s.target));
  const bonnes = s.boxes.filter((b) => b.correct);
  expect(bonnes.length * 3).toBe(s.boxes.length);
  for (const b of s.boxes) {
    expect(b.a * b.b === s.target).toBe(b.correct);   // chaque caisse dit vrai
    expect(b.a).toBeGreaterThanOrEqual(1); expect(b.a).toBeLessThanOrEqual(10);
    expect(b.b).toBeGreaterThanOrEqual(1); expect(b.b).toBeLessThanOrEqual(10);
  }
  // Le nombre est bien sous l'écran de jeu
  const stage = await page.locator('.stage').boundingBox();
  const cible = await page.locator('.target').boundingBox();
  expect(cible.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1);
  expect(errors).toEqual([]);
});

test('le personnage court à droite et saute au clavier', async ({ page }) => {
  await demarrer(page);
  const x0 = (await etat(page)).player.x;
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await etat(page)).player.x).toBeGreaterThan(x0 + 30);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');
  await expect.poll(async () => (await etat(page)).player.onGround).toBe(false);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await etat(page)).player.onGround).toBe(true);
});

test('bonne caisse cassée : compteur +1 ; mauvaise caisse : un cœur en moins', async ({ page }) => {
  await demarrer(page);
  const s = await etat(page);
  const bonne = s.boxes.findIndex((b) => b.correct);
  const mauvaise = s.boxes.findIndex((b) => !b.correct);
  await casser(page, bonne);
  expect((await etat(page)).found).toBe(1);
  await expect(page.locator('[data-found]')).toHaveText('1');
  await casser(page, mauvaise);
  expect((await etat(page)).hearts).toBe(2);
  await expect(page.locator('[data-hearts]')).toHaveAttribute('aria-label', 'Vies : 2 sur 3');
});

test('toutes les bonnes caisses + drapeau = niveau réussi', async ({ page }) => {
  await demarrer(page);
  const s = await etat(page);
  for (let i = 0; i < s.boxes.length; i++) if (s.boxes[i].correct) await casser(page, i);
  expect((await etat(page)).found).toBe(s.needed);
  await page.evaluate(() => window.__jeu.placerAuDrapeau());
  await page.keyboard.down('ArrowRight');
  await expect(page.getByRole('heading', { name: /Niveau réussi/ })).toBeVisible();
  await page.keyboard.up('ArrowRight');
  // Rejouer relance le niveau à zéro
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect.poll(async () => (await etat(page)).found).toBe(0);
});

test('trois mauvaises caisses = plus de cœurs, puis Rejouer', async ({ page }) => {
  await demarrer(page);
  const s = await etat(page);
  const mauvaises = s.boxes.map((b, i) => (b.correct ? -1 : i)).filter((i) => i >= 0).slice(0, 3);
  for (const i of mauvaises) await casser(page, i);
  await expect(page.getByRole('heading', { name: 'Plus de cœurs !' })).toBeVisible();
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect.poll(async () => (await etat(page)).hearts).toBe(3);
});

test('commandes tactiles visibles et utilisables sur téléphone et tablette', async ({ page }) => {
  test.skip(test.info().project.name === 'ordinateur', 'pas de commandes tactiles sur ordinateur');
  await demarrer(page);
  const droite = page.getByRole('button', { name: 'Aller à droite' });
  await expect(droite).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sauter' })).toBeVisible();
  const x0 = (await etat(page)).player.x;
  const box = await droite.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => (await etat(page)).player.x).toBeGreaterThan(x0 + 20);
  await page.mouse.up();
});

test('écran de jeu, nombre et commandes tiennent dans l\'écran, sans défilement horizontal @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const stage = await page.locator('.stage').boundingBox();
  expect(Math.abs(stage.width / stage.height - 5 / 3)).toBeLessThan(0.05);   // proportions gardées
  // Nombre à trouver et bouton « Sauter » entièrement visibles sans défiler.
  await expect(page.locator('.target')).toBeInViewport({ ratio: 1 });
  if (test.info().project.name !== 'ordinateur') {
    await expect(page.getByRole('button', { name: 'Sauter' })).toBeInViewport({ ratio: 1 });
  }
});
