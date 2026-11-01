/*
 * Puissance 4 (Minijeux) – interface du jeu.
 * Gère les deux écrans (choix du mode / partie), l'affichage du plateau,
 * et les tours de jeu. Rien n'est gardé en mémoire : chaque ouverture de la page
 * (changement de jeu, rechargement, autre appareil) repart du menu avec des scores à zéro.
 * La version, l'installation et les mises à jour sont gérées par js/version.js et js/pwa.js.
 */
import { ROWS, COLS, createBoard, dropRow, findWinner, isFull, chooseMove } from './puissance-4-engine.js';

const $ = (id) => document.getElementById('p4-' + id);
// Ancienne sauvegarde (v2.2 à v2.4) : effacée au chargement, la partie n'est plus gardée.
const OLD_STORAGE_KEY = 'ludoaventura-p4-v1';
const HUMAN = 1; // En mode solo, le joueur humain a les jetons rouges.
const AI = 2;
const LEVEL_NAMES = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

/* ---------------------------------------------------------------------------
 * État du jeu (en mémoire seulement, pour la durée de la page)
 * ------------------------------------------------------------------------- */
let state = {
  mode: null, // 'solo' ou 'duo'
  level: 'moyen',
  board: createBoard(),
  current: 1,
  starter: 1,
  over: false,
  winner: 0, // 0 = personne, 1 ou 2 = joueur, 3 = match nul
  winCells: [],
  scores: {}
};
let aiThinking = false;

try {
  localStorage.removeItem(OLD_STORAGE_KEY);
} catch {
  /* stockage indisponible : rien à effacer */
}

/** Clé des scores : chaque mode / niveau a son propre compteur. */
const scoreKey = () => (state.mode === 'solo' ? `solo-${state.level}` : 'duo');
const scores = () => (state.scores[scoreKey()] ||= { 1: 0, 2: 0 });
const hasGameInProgress = () =>
  state.mode && !state.over && state.board.some((row) => row.some((v) => v !== 0));

/* ---------------------------------------------------------------------------
 * Construction du plateau : 7 boutons (un par colonne) de 6 cases
 * ------------------------------------------------------------------------- */
const boardEl = $('board');
const cells = []; // cells[ligne][colonne] -> élément .cell
const colButtons = [];

function buildBoard() {
  for (let r = 0; r < ROWS; r++) cells.push([]);
  for (let c = 0; c < COLS; c++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'p4-col';
    btn.dataset.col = String(c);
    for (let r = 0; r < ROWS; r++) {
      const cell = document.createElement('span');
      cell.className = 'p4-cell';
      cell.dataset.row = String(r);
      btn.appendChild(cell);
      cells[r][c] = cell;
    }
    btn.addEventListener('click', () => onColumn(c));
    btn.addEventListener('keydown', onColumnKey);
    boardEl.appendChild(btn);
    colButtons.push(btn);
  }
}

/** Navigation au clavier : flèches gauche/droite entre les colonnes. */
function onColumnKey(e) {
  const c = Number(e.currentTarget.dataset.col);
  let next = null;
  if (e.key === 'ArrowLeft') next = (c + COLS - 1) % COLS;
  if (e.key === 'ArrowRight') next = (c + 1) % COLS;
  if (next !== null) {
    e.preventDefault();
    colButtons[next].focus();
  }
}

/** Crée l'élément jeton dans une case, avec ou sans animation de chute. */
function placeToken(r, c, player, animate) {
  const cell = cells[r][c];
  cell.querySelector('.p4-token')?.remove();
  const t = document.createElement('span');
  t.className = `p4-token p${player}`;
  if (animate) {
    t.classList.add('p4-drop');
    t.style.setProperty('--drop-from', String(r + 1));
    t.style.setProperty('--drop-time', `${0.18 + r * 0.05}s`);
  }
  cell.appendChild(t);
  cell.classList.add('p4-filled');
}

/** Redessine tout le plateau à partir de l'état (sans animation). */
function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = state.board[r][c];
      const cell = cells[r][c];
      cell.classList.remove('p4-filled');
      cell.querySelector('.p4-token')?.remove();
      if (v) placeToken(r, c, v, false);
    }
  }
  markWin();
  updateUI();
}

function markWin() {
  boardEl.classList.toggle('p4-over', state.over && state.winner !== 3);
  for (const [r, c] of state.winCells || []) cells[r][c].querySelector('.p4-token')?.classList.add('p4-win');
}

/* ---------------------------------------------------------------------------
 * Déroulement d'une partie
 * ------------------------------------------------------------------------- */
function playerName(p) {
  if (state.mode === 'solo') return p === HUMAN ? 'Toi' : 'Ordinateur';
  return p === 1 ? 'Rouge' : 'Jaune';
}

function statusText() {
  if (state.over) {
    if (state.winner === 3) return 'Match nul !';
    if (state.mode === 'solo') return state.winner === HUMAN ? 'Bravo, tu as gagné !' : "L'ordinateur a gagné.";
    return `${playerName(state.winner)} gagne !`;
  }
  if (state.mode === 'solo') return state.current === HUMAN ? 'À toi de jouer' : "L'ordinateur réfléchit…";
  return `Au tour de ${playerName(state.current)}`;
}

/** Met à jour textes, scores, cibles et accessibilité. */
function updateUI() {
  $('status').textContent = statusText();
  $('name-1').textContent = playerName(1);
  $('name-2').textContent = playerName(2);
  $('pts-1').textContent = scores()[1];
  $('pts-2').textContent = scores()[2];
  $('score-1').classList.toggle('p4-active', !state.over && state.current === 1);
  $('score-2').classList.toggle('p4-active', !state.over && state.current === 2);
  $('mode-badge').textContent = state.mode === 'solo' ? LEVEL_NAMES[state.level] : 'À deux';
  boardEl.dataset.turn = String(state.current);

  const locked = state.over || aiThinking || (state.mode === 'solo' && state.current === AI);
  for (let c = 0; c < COLS; c++) {
    const r = dropRow(state.board, c);
    const btn = colButtons[c];
    btn.disabled = locked || r === -1;
    for (let rr = 0; rr < ROWS; rr++) cells[rr][c].classList.toggle('p4-target', rr === r);
    const free = r + 1;
    btn.setAttribute(
      'aria-label',
      r === -1 ? `Colonne ${c + 1}, pleine` : `Colonne ${c + 1}, ${free} case${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`
    );
  }
  $('replay').textContent = state.over ? 'Rejouer' : 'Nouvelle partie';
}

/** Joue un coup dans une colonne pour le joueur courant. */
function play(c) {
  if (state.over) return false;
  const r = dropRow(state.board, c);
  if (r === -1) return false;
  state.board[r][c] = state.current;
  placeToken(r, c, state.current, true);
  vibrate(12);

  const win = findWinner(state.board);
  if (win) {
    state.over = true;
    state.winner = win.player;
    state.winCells = win.cells;
    scores()[win.player]++;
    vibrate([30, 60, 30]);
  } else if (isFull(state.board)) {
    state.over = true;
    state.winner = 3;
  } else {
    state.current = state.current === 1 ? 2 : 1;
  }
  // On attend la fin de la chute pour afficher la ligne gagnante.
  if (state.over) setTimeout(markWin, 450);
  updateUI();
  return true;
}

function onColumn(c) {
  if (aiThinking) return;
  if (state.mode === 'solo' && state.current !== HUMAN) return;
  if (play(c)) maybeAiTurn();
}

/** Si c'est au tour de l'ordinateur, il joue après une courte pause. */
function maybeAiTurn() {
  if (state.mode !== 'solo' || state.over || state.current !== AI) return;
  aiThinking = true;
  updateUI();
  // La pause laisse le temps à l'animation et rend le jeu plus naturel.
  setTimeout(() => {
    const col = chooseMove(state.board, AI, state.level);
    aiThinking = false;
    play(col);
  }, 450);
}

/** Démarre une nouvelle partie ; le premier joueur alterne à chaque partie. */
function newGame({ keepStarter = false } = {}) {
  if (!keepStarter) state.starter = state.starter === 1 ? 2 : 1;
  state.board = createBoard();
  state.current = state.starter;
  state.over = false;
  state.winner = 0;
  state.winCells = [];
  aiThinking = false;
  renderBoard();
  maybeAiTurn();
}

/* ---------------------------------------------------------------------------
 * Navigation entre les écrans
 * ------------------------------------------------------------------------- */
function showMenu() {
  $('game').hidden = true;
  $('menu').hidden = false;
  $('resume').hidden = !hasGameInProgress();
  const radio = document.querySelector(`input[name="p4-level"][value="${state.level}"]`);
  if (radio) radio.checked = true;
}

function showGame() {
  $('menu').hidden = true;
  $('game').hidden = false;
  window.scrollTo(0, 0); // le plateau commence juste sous la barre d'onglets
  renderBoard();
  colButtons.find((b) => !b.disabled)?.focus({ preventScroll: true });
  maybeAiTurn();
}

function startMode(mode) {
  state.mode = mode;
  if (mode === 'solo') state.level = document.querySelector('input[name="p4-level"]:checked').value;
  state.starter = 1; // Le joueur humain / Rouge commence la première partie.
  newGame({ keepStarter: true });
  showGame();
}

$('start-solo').addEventListener('click', () => startMode('solo'));
$('start-duo').addEventListener('click', () => startMode('duo'));
$('resume').addEventListener('click', showGame);
$('back').addEventListener('click', showMenu);
$('replay').addEventListener('click', () => newGame());

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non pris en charge */
  }
}

/* ---------------------------------------------------------------------------
 * Démarrage
 * ------------------------------------------------------------------------- */
buildBoard();
showMenu(); // on arrive toujours sur le choix du mode, avec une partie neuve

// Accès pour les tests automatiques.
window.__p4 = { get state() { return state; } };
