// Course aux étoiles : choix des tables, 3 réponses, compteur, étoiles, chronomètre, nom, classements.
const { test, expect } = require('@playwright/test');

const PAGE = 'multiplication/etoiles/';
const etat = (page) => page.evaluate(() => window.__etoiles.etat());
const groupe = (page) => page.getByRole('group', { name: 'Tables de multiplication' });

async function choisir(page, ...tables) {
  for (const t of tables) await groupe(page).getByRole('button', { name: String(t), exact: true }).click();
}

// Clique la bonne réponse de la question affichée (attend la question suivante).
async function bonneReponse(page) {
  const avant = await etat(page);
  await page.getByRole('group', { name: 'Réponses possibles' })
    .getByRole('button', { name: String(avant.question.good), exact: true }).click();
  await expect.poll(async () => (await etat(page)).score).toBe(avant.score + 1);
  if (avant.score + 1 < 50) {
    await expect.poll(async () => {
      const s = await etat(page);
      return s.question.a !== avant.question.a || s.question.b !== avant.question.b ||
        (await page.locator('.et-choice.is-good').count()) === 0;
    }).toBe(true);
    await expect(page.locator('.et-choice.is-good')).toHaveCount(0);
  }
}

// Joue une partie complète (50 bonnes réponses) avec les tables données.
async function partieComplete(page, tables) {
  await page.goto(PAGE);
  await choisir(page, ...tables);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  for (let i = 0; i < 50; i++) await bonneReponse(page);
  await expect(page.getByRole('heading', { name: /Bravo, 3 étoiles/ })).toBeVisible();
}

test('la vignette « Course aux étoiles » ouvre le jeu depuis l\'onglet Multiplication @smoke', async ({ page }) => {
  await page.goto('multiplication/');
  const vignette = page.getByRole('link', { name: /Course aux étoiles/ });
  expect(await vignette.locator('img').evaluate((el) => el.naturalWidth)).toBeGreaterThan(0);
  await vignette.click();
  await expect(page).toHaveURL(/\/multiplication\/etoiles\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Course aux étoiles');
  await expect(page.getByRole('navigation', { name: 'Jeux' }).getByRole('link', { name: /Multiplication/ }))
    .toHaveAttribute('aria-current', 'true');
});

test('choix des tables : aucune au départ, Démarrer attend un choix, tables 3 et 7 seulement', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE);
  await expect(page.getByRole('button', { name: 'Démarrer' })).toBeDisabled();
  await choisir(page, 3, 7);
  await expect(groupe(page).getByRole('button', { name: '3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-hint]')).toHaveText('Tu seras interrogé sur les tables de 3 et 7.');
  await page.getByRole('button', { name: 'Démarrer' }).click();
  for (let i = 0; i < 15; i++) {
    const s = await etat(page);
    expect([s.question.a, s.question.b].some((x) => x === 3 || x === 7)).toBe(true);
    await bonneReponse(page);
  }
  expect(errors).toEqual([]);
});

test('3 réponses à droite du « = », les unes sous les autres, une seule juste', async ({ page }) => {
  await page.goto(PAGE);
  await groupe(page).getByRole('button', { name: 'Toutes' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  for (let i = 0; i < 10; i++) {
    const s = await etat(page);
    expect(s.question.choices).toHaveLength(3);
    expect(new Set(s.question.choices).size).toBe(3);
    expect(s.question.choices.filter((v) => v === s.question.a * s.question.b)).toHaveLength(1);
    s.question.choices.forEach((v) => expect(v).toBeGreaterThan(0));
    const eq = await page.locator('.et-eq').boundingBox();
    const boutons = page.locator('.et-choice');
    const boxes = await Promise.all([0, 1, 2].map((k) => boutons.nth(k).boundingBox()));
    for (let k = 0; k < 3; k++) {
      expect(boxes[k].x).toBeGreaterThan(eq.x + eq.width - 1);                 // à droite du =
      if (k) expect(boxes[k].y).toBeGreaterThanOrEqual(boxes[k - 1].y + boxes[k - 1].height - 1); // empilées
      expect(Math.abs(boxes[k].x - boxes[0].x)).toBeLessThan(2);
    }
    await bonneReponse(page);
  }
});

test('mauvaise réponse : le compteur ne bouge pas et la correction s\'affiche', async ({ page }) => {
  await page.goto(PAGE);
  await choisir(page, 6);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  await bonneReponse(page);
  const s = await etat(page);
  const faux = s.question.choices.find((v) => v !== s.question.good);
  await page.getByRole('group', { name: 'Réponses possibles' }).getByRole('button', { name: String(faux), exact: true }).click();
  await expect(page.locator('[data-feedback]')).toHaveText(`Non : ${s.question.a} × ${s.question.b} = ${s.question.good}`);
  await expect(page.locator('[data-score]')).toHaveText('1');
  await page.waitForTimeout(1100);
  expect((await etat(page)).score).toBe(1);
});

test('étoiles bronze (10), argent (25), or (50) ; chrono arrêté à la 50e ; nom ; classement', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(PAGE);
  await choisir(page, 2);
  await page.getByRole('button', { name: 'Démarrer' }).click();
  const etoile = (n) => page.locator(`[data-star="${n}"]`);
  for (let i = 1; i <= 50; i++) {
    await bonneReponse(page);
    if (i === 9) await expect(etoile(10)).not.toHaveClass(/is-won/);
    if (i === 10) { await expect(etoile(10)).toHaveClass(/is-won/); await expect(etoile(25)).not.toHaveClass(/is-won/); }
    if (i === 24) await expect(etoile(25)).not.toHaveClass(/is-won/);
    if (i === 25) { await expect(etoile(25)).toHaveClass(/is-won/); await expect(etoile(50)).not.toHaveClass(/is-won/); }
    if (i === 49) {
      await page.waitForTimeout(300);
      const t1 = await page.locator('[data-timer]').textContent();
      await page.waitForTimeout(300);
      expect(await page.locator('[data-timer]').textContent()).not.toBe(t1);        // le chrono tourne
    }
  }
  await expect(etoile(50)).toHaveClass(/is-won/);
  const s = await etat(page);
  expect(s.running).toBe(false);
  expect(s.elapsed).toBeGreaterThan(0);
  const temps = await page.locator('[data-timer]').textContent();
  await page.waitForTimeout(400);
  expect(await page.locator('[data-timer]').textContent()).toBe(temps);             // chrono arrêté
  // Fin de partie : temps, nom, classement
  await expect(page.getByRole('heading', { name: /Bravo, 3 étoiles/ })).toBeVisible();
  await expect(page.locator('[data-final-time]')).toHaveText(temps);
  await expect(page.locator('[data-board]')).toHaveText('Aucun temps enregistré pour 1 table pour l’instant.');
  await page.getByLabel('Ton nom pour le classement').fill('Léa');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('[data-saved]')).toHaveText('Enregistré ! Tu es 1er du classement.');
  await expect(page.getByRole('heading', { name: 'Les 10 meilleurs temps — 1 table' })).toBeVisible();
  const ligne = page.locator('.et-board tbody tr.is-me');
  await expect(ligne).toContainText('Léa');
  await expect(ligne).toContainText(temps);
});

test('classements : 10 meilleurs temps triés, un classement par nombre de tables, gardés sur l\'appareil', async ({ page }) => {
  await page.goto(PAGE);
  // Pré-remplissage : 12 temps pour 2 tables, 1 temps pour 3 tables
  await page.evaluate(() => {
    const deux = Array.from({ length: 12 }, (_, i) => ({ name: 'Joueur ' + (i + 1), ms: 60000 + i * 1000, tables: [2, 5], date: '2026-11-02', id: 'x' + i }));
    localStorage.setItem('minijeux-etoiles-classements-v1', JSON.stringify({ 2: deux.slice(0, 10), 3: [{ name: 'Trois', ms: 99000, tables: [2, 3, 4], date: '2026-11-02', id: 't' }] }));
  });
  await page.reload();
  await page.getByText('Voir les meilleurs temps').click();
  await page.getByLabel('Classement :').selectOption('2');
  const lignes = page.locator('[data-board-preview] tbody tr');
  await expect(lignes).toHaveCount(10);
  await expect(lignes.first()).toContainText('Joueur 1');
  await expect(lignes.first()).toContainText('1:00.0');
  await page.getByLabel('Classement :').selectOption('3');
  await expect(lignes).toHaveCount(1);
  await expect(lignes.first()).toContainText('Trois');
  await page.getByLabel('Classement :').selectOption('7');
  await expect(page.locator('[data-board-preview]')).toContainText('Aucun temps enregistré pour 7 tables');
});

test('un nouveau très bon temps entre dans le top 10 du bon classement et en chasse le dernier', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(PAGE);
  await page.evaluate(() => {
    const lents = Array.from({ length: 10 }, (_, i) => ({ name: 'Lent ' + (i + 1), ms: 3600000 + i, tables: [4], date: '2026-11-02', id: 'l' + i }));
    localStorage.setItem('minijeux-etoiles-classements-v1', JSON.stringify({ 1: lents, 2: [{ name: 'Autre', ms: 1, tables: [1, 2], date: '2026-11-02', id: 'a' }] }));
  });
  await partieComplete(page, [9]);
  await page.getByLabel('Ton nom pour le classement').fill('<b>Tom</b>');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('[data-saved]')).toHaveText('Enregistré ! Tu es 1er du classement.');
  const lignes = page.locator('[data-board] tbody tr');
  await expect(lignes).toHaveCount(10);
  await expect(lignes.first()).toContainText('<b>Tom</b>');                 // affiché tel quel, sans HTML
  await expect(page.locator('[data-board]')).not.toContainText('Lent 10');
  await expect(page.locator('[data-board]')).not.toContainText('Autre');   // autre classement
  // Rejouer revient au choix des tables, déjà mémorisé
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await expect(groupe(page).getByRole('button', { name: '9', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('affichage : pas de défilement horizontal, question et réponses visibles @smoke', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole('button', { name: 'Démarrer' })).toBeInViewport({ ratio: 1 });
  await groupe(page).getByRole('button', { name: 'Toutes' }).click();
  await page.getByRole('button', { name: 'Démarrer' }).click();
  for (const loc of [page.locator('.et-calc'), ...[0, 1, 2].map((k) => page.locator('.et-choice').nth(k)), page.locator('[data-timer]')]) {
    await expect(loc).toBeInViewport({ ratio: 1 });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
