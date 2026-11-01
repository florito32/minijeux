// Puissance 4 : règles du jeu et ordinateur, testés sans navigateur (une seule fois).
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

let E;
test.beforeAll(async () => {
  E = await import(pathToFileURL(path.join(__dirname, '..', 'js', 'puissance-4-engine.js')).href);
});
test.beforeEach(() => {
  test.skip(test.info().project.name !== 'ordinateur', 'moteur testé une seule fois');
});

// Joue une suite de colonnes en alternant les joueurs (Rouge = 1 commence).
function playSeq(cols) {
  const b = E.createBoard();
  let p = 1;
  for (const c of cols) { b[E.dropRow(b, c)][c] = p; p = p === 1 ? 2 : 1; }
  return b;
}

test('un jeton tombe en bas, une colonne pleine est refusée', () => {
  const b = playSeq([0, 0, 0, 0, 0, 0]);
  expect(E.dropRow(b, 0)).toBe(-1);
  expect(E.dropRow(b, 1)).toBe(E.ROWS - 1);
});

test('victoires horizontale, verticale et diagonales détectées', () => {
  expect(E.findWinner(playSeq([0, 0, 1, 1, 2, 2, 3])).player).toBe(1);
  expect(E.findWinner(playSeq([0, 1, 0, 1, 0, 1, 0])).player).toBe(1);
  // Diagonales : on pose directement les jetons.
  const up = E.createBoard(); [[5, 0], [4, 1], [3, 2], [2, 3]].forEach(([r, c]) => (up[r][c] = 2));
  expect(E.findWinner(up)).toEqual({ player: 2, cells: [[2, 3], [3, 2], [4, 1], [5, 0]] });
  const down = E.createBoard(); [[2, 0], [3, 1], [4, 2], [5, 3]].forEach(([r, c]) => (down[r][c] = 1));
  expect(E.findWinner(down).player).toBe(1);
});

test('3 jetons alignés ne gagnent pas ; plateau plein sans gagnant = match nul', () => {
  expect(E.findWinner(playSeq([0, 6, 1, 6, 2]))).toBeNull();
  const b = ['1212121', '1212121', '2121212', '2121212', '1212121', '1212121'].map((r) => [...r].map(Number));
  expect(E.isFull(b)).toBe(true);
  expect(E.findWinner(b)).toBeNull();
});

for (const level of ['facile', 'moyen', 'difficile']) {
  test(`ordinateur ${level} : gagne quand il le peut`, () => {
    expect(E.chooseMove(playSeq([0, 4, 1, 4, 6, 4, 6]), 2, level, () => 0.99)).toBe(4);
  });
}
for (const level of ['moyen', 'difficile']) {
  test(`ordinateur ${level} : bloque une victoire adverse`, () => {
    expect(E.chooseMove(playSeq([0, 6, 1, 6, 2]), 2, level, () => 0.99)).toBe(3);
  });
}

test('ordinateur difficile : bat un joueur au hasard et répond vite', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let game = 0; game < 4; game++) {
    const b = E.createBoard();
    let p = game % 2 ? 1 : 2, w = null;
    while (!w && !E.isFull(b)) {
      const cols = E.validCols(b);
      const t = Date.now();
      const c = p === 2 ? E.chooseMove(b, 2, 'difficile') : cols[Math.floor(rnd() * cols.length)];
      expect(Date.now() - t).toBeLessThan(2000);
      b[E.dropRow(b, c)][c] = p;
      w = E.findWinner(b);
      p = p === 1 ? 2 : 1;
    }
    expect(w && w.player).toBe(2);
  }
});
