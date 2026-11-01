/*
 * Moteur du Puissance 4 (Ludoaventura) : règles du jeu et intelligence artificielle.
 * Aucune dépendance à l'affichage, pour pouvoir être testé seul.
 *
 * Plateau : tableau de 6 lignes × 7 colonnes. board[ligne][colonne],
 * la ligne 0 est en haut. 0 = vide, 1 = joueur rouge, 2 = joueur jaune.
 */

export const ROWS = 6;
export const COLS = 7;

/** Crée un plateau vide. */
export function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/** Copie profonde d'un plateau. */
export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

/** Renvoie la ligne où tomberait un jeton dans cette colonne, ou -1 si elle est pleine. */
export function dropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

/** Liste des colonnes encore jouables. */
export function validCols(board) {
  const cols = [];
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) cols.push(c);
  return cols;
}

/** Vrai si plus aucune case n'est libre. */
export function isFull(board) {
  return validCols(board).length === 0;
}

// Les 4 directions à vérifier : horizontale, verticale, deux diagonales.
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
];

/**
 * Cherche un alignement de 4 jetons identiques.
 * Renvoie { player, cells: [[r,c],...] } ou null.
 */
export function findWinner(board) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr][cc] !== p) break;
          cells.push([rr, cc]);
        }
        if (cells.length === 4) return { player: p, cells };
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Intelligence artificielle : algorithme minimax avec élagage alpha-bêta.
 * Plus la profondeur de recherche est grande, plus l'ordinateur est fort.
 * ------------------------------------------------------------------------- */

// On explore d'abord le centre : les coups centraux sont souvent les meilleurs,
// ce qui accélère l'élagage.
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6];

/** Note une fenêtre de 4 cases du point de vue de `player`. */
function scoreWindow(cells, player) {
  const opp = player === 1 ? 2 : 1;
  let mine = 0;
  let theirs = 0;
  let empty = 0;
  for (const v of cells) {
    if (v === player) mine++;
    else if (v === opp) theirs++;
    else empty++;
  }
  if (mine === 4) return 1000;
  if (mine === 3 && empty === 1) return 6;
  if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -5;
  if (theirs === 2 && empty === 2) return -1;
  return 0;
}

/** Évaluation heuristique d'une position (sans gagnant) pour `player`. */
export function evaluate(board, player) {
  let score = 0;
  // Bonus pour la colonne centrale.
  for (let r = 0; r < ROWS; r++) if (board[r][3] === player) score += 3;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        const cells = [];
        for (let k = 0; k < 4; k++) cells.push(board[r + dr * k][c + dc * k]);
        score += scoreWindow(cells, player);
      }
    }
  }
  return score;
}

const WIN_SCORE = 1_000_000;

function minimax(board, depth, alpha, beta, maximizing, ai) {
  const human = ai === 1 ? 2 : 1;
  const win = findWinner(board);
  // On préfère gagner vite et perdre tard : le score dépend de la profondeur restante.
  if (win) return win.player === ai ? WIN_SCORE + depth : -WIN_SCORE - depth;
  if (isFull(board)) return 0;
  if (depth === 0) return evaluate(board, ai);

  const cols = COL_ORDER.filter((c) => board[0][c] === 0);
  if (maximizing) {
    let best = -Infinity;
    for (const c of cols) {
      const r = dropRow(board, c);
      board[r][c] = ai;
      best = Math.max(best, minimax(board, depth - 1, alpha, beta, false, ai));
      board[r][c] = 0;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const c of cols) {
    const r = dropRow(board, c);
    board[r][c] = human;
    best = Math.min(best, minimax(board, depth - 1, alpha, beta, true, ai));
    board[r][c] = 0;
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

/** Profondeur de recherche selon le niveau. */
export const LEVELS = {
  facile: { depth: 2, randomness: 0.35 },
  moyen: { depth: 4, randomness: 0.08 },
  difficile: { depth: 7, randomness: 0 }
};

/**
 * Choisit la colonne à jouer pour l'ordinateur.
 * @param {number[][]} board plateau actuel
 * @param {number} ai joueur de l'ordinateur (1 ou 2)
 * @param {'facile'|'moyen'|'difficile'} level niveau
 * @param {() => number} rand générateur aléatoire (remplaçable dans les tests)
 */
export function chooseMove(board, ai, level = 'moyen', rand = Math.random) {
  const { depth, randomness } = LEVELS[level] || LEVELS.moyen;
  const human = ai === 1 ? 2 : 1;
  const cols = validCols(board);
  if (cols.length === 0) return -1;

  // Toujours gagner tout de suite si possible, et toujours bloquer
  // une victoire immédiate de l'adversaire (sauf au niveau facile, parfois).
  for (const c of cols) {
    const b = cloneBoard(board);
    b[dropRow(b, c)][c] = ai;
    if (findWinner(b)) return c;
  }
  for (const c of cols) {
    const b = cloneBoard(board);
    b[dropRow(b, c)][c] = human;
    if (findWinner(b) && !(level === 'facile' && rand() < 0.3)) return c;
  }

  // Une part de hasard rend les niveaux faciles plus humains.
  if (rand() < randomness) return cols[Math.floor(rand() * cols.length)];

  const work = cloneBoard(board);
  let bestScore = -Infinity;
  let bestCols = [];
  for (const c of COL_ORDER) {
    if (work[0][c] !== 0) continue;
    const r = dropRow(work, c);
    work[r][c] = ai;
    const s = minimax(work, depth - 1, -Infinity, Infinity, false, ai);
    work[r][c] = 0;
    if (s > bestScore) {
      bestScore = s;
      bestCols = [c];
    } else if (s === bestScore) {
      bestCols.push(c);
    }
  }
  // Entre coups équivalents, le premier de COL_ORDER (le plus central) est préféré.
  return bestCols[0];
}
