// Puissance 4 : parcours de jeu, ordinateur, sauvegarde, affichage sur chaque écran.
// Les tests marqués @smoke sont aussi rejoués sur la page en ligne.
const { test, expect } = require('@playwright/test');

const col = (page, c) => page.locator(`.p4-col[data-col="${c}"]`);
const tokens = (page) => page.locator('#p4-board .p4-token');

// Clic ou toucher selon l'appareil simulé.
async function press(page, c) {
  if (test.info().project.use.hasTouch) await col(page, c).tap();
  else await col(page, c).click();
}

test('onglet Puissance 4 présent et actif @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const nav = page.getByRole('navigation', { name: 'Jeux' });
  await nav.getByRole('link', { name: /Puissance 4/ }).click();
  await expect(page).toHaveURL(/\/puissance-4\/$/);
  await expect(nav.getByRole('link', { name: /Puissance 4/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1, name: 'Puissance 4' })).toBeVisible();
});

test('à deux : Rouge gagne en colonne, score, puis Jaune commence la suivante @smoke', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  await expect(page.locator('#p4-status')).toHaveText('Au tour de Rouge');
  for (const c of [0, 1, 0, 1, 0, 1, 0]) await press(page, c);
  await expect(page.locator('#p4-status')).toHaveText('Rouge gagne !');
  await expect(page.locator('#p4-pts-1')).toHaveText('1');
  await expect(page.locator('.p4-token.p4-win')).toHaveCount(4);
  await expect(col(page, 3)).toBeDisabled();
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect(tokens(page)).toHaveCount(0);
  await expect(page.locator('#p4-status')).toHaveText('Au tour de Jaune');
  expect(errors).toEqual([]);
});

test("contre l'ordinateur (Difficile) : il répond à mon coup @smoke", async ({ page }) => {
  await page.goto('puissance-4/');
  await page.getByRole('radio', { name: 'Difficile' }).check();
  await page.getByRole('button', { name: "Jouer contre l'ordinateur" }).click();
  await expect(page.locator('#p4-mode-badge')).toHaveText('Difficile');
  await expect(page.locator('#p4-status')).toHaveText('À toi de jouer');
  await press(page, 3);
  // Pendant que l'ordinateur réfléchit, on ne peut pas jouer.
  await expect(col(page, 1)).toBeDisabled();
  await expect(tokens(page)).toHaveCount(2, { timeout: 5000 });
  await expect(page.locator('#p4-board .p4-token.p2')).toHaveCount(1);
  await expect(page.locator('#p4-status')).toHaveText('À toi de jouer');
  await expect(col(page, 1)).toBeEnabled();
});

test('une colonne pleine est désactivée', async ({ page }) => {
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  for (let i = 0; i < 6; i++) await press(page, 6);
  await expect(col(page, 6)).toBeDisabled();
  await expect(col(page, 6)).toHaveAttribute('aria-label', /pleine/);
});

// Demande (v2.6) : la partie et les scores repartent toujours de zéro quand on revient sur le jeu.
async function partieAvecVictoire(page) {
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  for (const c of [0, 1, 0, 1, 0, 1, 0]) await press(page, c);
  await expect(page.locator('#p4-pts-1')).toHaveText('1');
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await press(page, 2);
}
async function attendDepartAZero(page) {
  await expect(page.getByRole('button', { name: "Jouer contre l'ordinateur" })).toBeVisible();
  await expect(page.locator('#p4-game')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Reprendre la partie en cours' })).toBeHidden();
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  await expect(tokens(page)).toHaveCount(0);
  await expect(page.locator('#p4-pts-1')).toHaveText('0');
  await expect(page.locator('#p4-pts-2')).toHaveText('0');
  await expect(page.locator('#p4-status')).toHaveText('Au tour de Rouge');
}

test('aller sur un autre jeu puis revenir : la partie repart de zéro @smoke', async ({ page }) => {
  await partieAvecVictoire(page);
  const nav = page.getByRole('navigation', { name: 'Jeux' });
  await nav.getByRole('link', { name: /Multiplication/ }).click();
  await expect(page).toHaveURL(/\/multiplication\//);
  await page.getByRole('navigation', { name: 'Jeux' }).getByRole('link', { name: /Puissance 4/ }).click();
  await attendDepartAZero(page);
});

test('bouton « précédent » après un autre jeu : la partie repart de zéro', async ({ page }) => {
  await partieAvecVictoire(page);
  await page.getByRole('navigation', { name: 'Jeux' }).getByRole('link', { name: /Multiplication/ }).click();
  await expect(page).toHaveURL(/\/multiplication\//);
  await page.goBack();
  await expect(page).toHaveURL(/\/puissance-4\//);
  await attendDepartAZero(page);
});

test('recharger ou rouvrir le jeu : la partie et les scores repartent de zéro', async ({ page }) => {
  await partieAvecVictoire(page);
  await page.reload();
  await attendDepartAZero(page);
});

test("une ancienne sauvegarde (v2.2 à v2.4) est ignorée et effacée", async ({ page }) => {
  await page.goto('puissance-4/');
  await page.evaluate(() => localStorage.setItem('ludoaventura-p4-v1', JSON.stringify({ mode: 'duo', level: 'moyen',
    board: [[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[1,2,0,0,0,0,0]],
    current: 1, starter: 1, over: false, winner: 0, winCells: [], scores: { duo: { 1: 3, 2: 1 } } })));
  await page.reload();
  await attendDepartAZero(page);
  expect(await page.evaluate(() => localStorage.getItem('ludoaventura-p4-v1'))).toBeNull();
});

test('le retour au menu pendant une partie permet de la reprendre (même page)', async ({ page }) => {
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  await press(page, 2);
  await page.getByRole('button', { name: 'Retour au choix du mode' }).click();
  await page.getByRole('button', { name: 'Reprendre la partie en cours' }).click();
  await expect(tokens(page)).toHaveCount(1);
});

test('clavier : flèches et Entrée pour jouer', async ({ page }) => {
  test.skip(test.info().project.name !== 'ordinateur', 'navigation clavier testée sur ordinateur');
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  await col(page, 0).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('.p4-col[data-col="2"] .p4-token')).toHaveCount(1);
});

test('affichage : plateau et bouton entièrement visibles, sans défilement horizontal', async ({ page }) => {
  await page.goto('puissance-4/');
  const vp = page.viewportSize();
  const solo = await page.getByRole('button', { name: "Jouer contre l'ordinateur" }).boundingBox();
  expect(solo.y + solo.height).toBeLessThanOrEqual(vp.height);
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  const box = await page.locator('#p4-board').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
  const nav = await page.locator('nav.tabs').boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height - 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
  const replay = await page.locator('#p4-replay').boundingBox();
  expect(replay.y + replay.height).toBeLessThanOrEqual(vp.height + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  // Colonnes assez larges pour le doigt
  expect((await col(page, 0).boundingBox()).width).toBeGreaterThanOrEqual(36);
  await press(page, 3);
  await expect(tokens(page)).toHaveCount(1);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

// Formats supplémentaires (petits téléphones, paysage) en plus des 4 projets de la configuration.
for (const [name, size] of [['petit téléphone', [320, 568]], ['paysage', [844, 390]], ['paysage moyen', [740, 520]], ['grand carré', [720, 720]]]) {
  test(`affichage ${name} (${size[0]}×${size[1]})`, async ({ page }) => {
    test.skip(test.info().project.name !== 'telephone', 'formats extra testés une seule fois');
    await page.setViewportSize({ width: size[0], height: size[1] });
    await page.goto('puissance-4/');
    await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
    const box = await page.locator('#p4-board').boundingBox();
    // Le plateau ne passe pas sous la barre d'onglets (collée en haut).
    const nav = await page.locator('nav.tabs').boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(nav.y + nav.height - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(size[0] + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(size[1] + 0.5);
    const replay = await page.locator('#p4-replay').boundingBox();
    expect(replay.y + replay.height).toBeLessThanOrEqual(size[1] + 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

// Bug corrigé (v2.4) : sur téléphone, les emplacements bougeaient quand un jeton arrivait
// (un style « .target » du site décalait la case visée). Les cases ne doivent jamais bouger.
test('les emplacements ne bougent pas quand un jeton tombe @smoke', async ({ page }) => {
  await page.goto('puissance-4/');
  await page.getByRole('button', { name: 'Jouer à deux sur ce téléphone' }).click();
  const positions = () => page.evaluate(() =>
    [...document.querySelectorAll('.p4-cell')].map((c) => {
      const r = c.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',');
    }));
  const avant = await positions();
  // Toutes les cases ont la même taille
  expect(new Set(avant.map((p) => p.split(',').slice(2).join(','))).size).toBe(1);
  for (const c of [3, 3, 2, 4, 6, 0]) {
    await press(page, c);
    expect(await positions()).toEqual(avant); // pendant la chute
    await page.waitForTimeout(700);
    expect(await positions()).toEqual(avant); // après la chute
  }
});
