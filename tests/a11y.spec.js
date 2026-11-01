// Accessibilité : audit automatique axe-core (règles WCAG 2.1 A et AA) sur chaque page,
// en thème clair et en thème sombre.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

for (const scheme of ['light', 'dark']) {
  for (const path of ['multiplication/']) {
    test(`aucune violation WCAG A/AA (${scheme}) : ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map((v) =>
        `${v.id} (${v.nodes.length}) : ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      expect(summary).toEqual([]);
    });
  }
}

test('le lien « Aller au contenu » est le premier arrêt clavier', async ({ page, browserName }) => {
  test.skip(test.info().project.name !== 'ordinateur', 'navigation clavier testée sur ordinateur');
  await page.goto('multiplication/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
});
