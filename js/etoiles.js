// Course aux étoiles : quiz chronométré sur les tables de multiplication.
// 1) Le joueur choisit ses tables (1 à 10) puis démarre.
// 2) Une multiplication + 3 réponses : une bonne réponse ajoute 1 au compteur, une mauvaise ne change rien.
// 3) Étoiles : bronze à 10, argent à 25, or à 50. Le chronomètre s'arrête à la 50e bonne réponse.
// 3 bis) Vies : 3 au départ, une mauvaise réponse en retire une ; +1 vie aux paliers 10 et 25 (jamais plus de 3).
//        À 0 vie, la partie est perdue : score et étoiles affichés, pas de classement.
// 4) Le joueur inscrit son nom : 10 meilleurs temps gardés sur l'appareil, un classement par nombre de tables.
(function () {
  'use strict';

  var GOAL = 50;
  var STARS = [
    { at: 10, name: 'bronze', label: 'Étoile de bronze' },
    { at: 25, name: 'argent', label: 'Étoile d’argent' },
    { at: 50, name: 'or', label: 'Étoile d’or' }
  ];
  var MAX_LIVES = 3;
  var LIFE_AT = [10, 25];           // paliers qui rendent une vie (si le joueur en a moins de 3)
  var TOP = 10;
  var BOARD_KEY = 'minijeux-etoiles-classements-v1';
  var TABLES_KEY = 'minijeux-etoiles-tables-v1';
  var NAME_KEY = 'minijeux-etoiles-nom-v1';
  var WRONG_DELAY = 900;            // le temps de lire la correction après une erreur (ms)

  function $(sel) { return document.querySelector(sel); }
  var screens = { choix: $('[data-screen="choix"]'), jeu: $('[data-screen="jeu"]'), fin: $('[data-screen="fin"]') };
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-table]'));
  var allBtn = $('[data-all]'), hint = $('[data-hint]'), startBtn = $('[data-start]');
  var scoreEl = $('[data-score]'), timerEl = $('[data-timer]'), progressEl = $('[data-progress]');
  var calcEl = $('[data-calc]'), choicesEl = $('[data-choices]'), feedbackEl = $('[data-feedback]');
  var starEls = Array.prototype.slice.call(document.querySelectorAll('[data-star]'));
  var finalTimeEl = $('[data-final-time]'), finalTablesEl = $('[data-final-tables]');
  var nameForm = $('[data-name-form]'), nameInput = $('#et-nom'), savedEl = $('[data-saved]');
  var boardEl = $('[data-board]'), boardTitle = $('[data-board-title]');
  var boardSelect = $('[data-board-select]'), boardPreview = $('[data-board-preview]');
  var heartEls = Array.prototype.slice.call(document.querySelectorAll('[data-heart]'));
  var livesText = $('[data-lives-text]'), finTitle = $('[data-fin-title]');
  var lostSummary = $('[data-lost-summary]'), wonOnly = $('[data-won-only]');

  /* ---------- Stockage (protégé : navigation privée, stockage bloqué…) ---------- */
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /* ---------- État ---------- */
  var tables = load(TABLES_KEY, []).filter(function (n) { return n >= 1 && n <= 10; });
  var score = 0, lives = MAX_LIVES, question = null, locked = false;
  var startTime = 0, elapsed = 0, timerId = 0, running = false;
  var lastEntry = null;             // dernière performance enregistrée (pour la surligner)

  /* ---------- Outils ---------- */
  function rand(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // Temps lisible : 1:23.4 (minutes:secondes.dixièmes)
  function fmt(ms) {
    var tenths = Math.floor(ms / 100), s = Math.floor(tenths / 10), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0') + '.' + (tenths % 10);
  }
  function tablesLabel(list) {
    return list.length === 10 ? 'toutes les tables' :
      (list.length > 1 ? 'tables de ' : 'table de ') + list.join(', ').replace(/, (\d+)$/, ' et $1');
  }

  /* ---------- Écran 1 : choix des tables ---------- */
  function renderChips() {
    chips.forEach(function (c) {
      c.setAttribute('aria-pressed', tables.indexOf(Number(c.dataset.table)) >= 0 ? 'true' : 'false');
    });
    startBtn.disabled = !tables.length;
    allBtn.textContent = tables.length === 10 ? 'Aucune' : 'Toutes';
    hint.textContent = tables.length
      ? 'Tu seras interrogé sur ' + (tables.length === 10 ? '' : tables.length > 1 ? 'les ' : 'la ') + tablesLabel(tables) + '.'
      : 'Touche une ou plusieurs tables.';
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var n = Number(c.dataset.table), i = tables.indexOf(n);
      if (i >= 0) tables.splice(i, 1); else tables.push(n);
      tables.sort(function (a, b) { return a - b; });
      save(TABLES_KEY, tables); renderChips();
    });
  });
  allBtn.addEventListener('click', function () {
    tables = tables.length === 10 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    save(TABLES_KEY, tables); renderChips();
  });

  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
  }

  /* ---------- Questions ---------- */
  // Une multiplication d'une des tables choisies (ex. table de 7 : 7 × n ou n × 7), différente de la précédente.
  function newQuestion() {
    var a, b, t;
    do {
      t = tables[rand(tables.length)];
      var n = 1 + rand(10);
      if (rand(2)) { a = t; b = n; } else { a = n; b = t; }
    } while (question && a === question.a && b === question.b && tables.length * 10 > 1);
    var good = a * b;
    // Deux pièges plausibles : produits voisins (a±1)×b, a×(b±1), puis bonne réponse ± 1, 2…
    var pool = [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), good + 1, good - 1, good + 2, good - 2, good + 10, good - 10];
    var wrong = [];
    shuffle(pool).forEach(function (v) {
      if (wrong.length < 2 && v > 0 && v !== good && wrong.indexOf(v) < 0) wrong.push(v);
    });
    question = { a: a, b: b, good: good, choices: shuffle([good].concat(wrong)) };
    calcEl.textContent = a + ' × ' + b;
    choicesEl.innerHTML = '';
    question.choices.forEach(function (v) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'et-choice';
      btn.textContent = v;
      btn.addEventListener('click', function () { answer(btn, v); });
      choicesEl.appendChild(btn);
    });
    locked = false;
  }

  function answer(btn, value) {
    if (locked || !running) return;
    locked = true;
    if (value === question.good) {
      score++;
      // Le chronomètre s'arrête au moment du clic sur la 50e bonne réponse.
      if (score >= GOAL) stopTimer();
      btn.classList.add('is-good');
      feedbackEl.textContent = '';
      updateScore(true);
      if (LIFE_AT.indexOf(score) >= 0 && lives < MAX_LIVES) {
        lives++;
        renderLives('gain');
        feedbackEl.textContent = (feedbackEl.textContent ? feedbackEl.textContent + ' ' : '') + '+1 vie ♥';
      }
      if (score >= GOAL) { setTimeout(finish, 600); return; }
      setTimeout(newQuestion, 250);
    } else {
      // Mauvaise réponse : le compteur ne bouge pas, on montre la bonne réponse puis on continue.
      btn.classList.add('is-bad');
      Array.prototype.forEach.call(choicesEl.children, function (b) {
        if (Number(b.textContent) === question.good) b.classList.add('is-good');
      });
      feedbackEl.textContent = 'Non : ' + question.a + ' × ' + question.b + ' = ' + question.good;
      // Une erreur coûte une vie ; à 0 vie, la partie est perdue (après la correction).
      lives--;
      renderLives('loss');
      if (lives <= 0) { stopTimer(); setTimeout(lose, WRONG_DELAY); return; }
      setTimeout(function () { feedbackEl.textContent = ''; newQuestion(); }, WRONG_DELAY);
    }
  }

  function updateScore(justScored) {
    scoreEl.textContent = score;
    progressEl.style.width = (score / GOAL * 100) + '%';
    STARS.forEach(function (st, i) {
      var won = score >= st.at, el = starEls[i];
      var wasWon = el.classList.contains('is-won');
      el.classList.toggle('is-won', won);
      el.querySelector('[data-star-text]').textContent = st.label + (won ? ' : gagnée !' : ' : pas encore');
      if (won && !wasWon && justScored) {
        el.classList.add('is-new');                           // petite animation d'apparition
        setTimeout(function () { el.classList.remove('is-new'); }, 900);
        if (st.at < GOAL) feedbackEl.textContent = st.label + ' gagnée !';
      }
    });
  }

  /* ---------- Vies (cœurs) ---------- */
  // effect : 'gain' ou 'loss' pour animer le cœur concerné, rien au démarrage.
  function renderLives(effect) {
    heartEls.forEach(function (h, i) {
      var alive = i < lives;
      h.classList.toggle('is-lost', !alive);
      var changed = effect === 'gain' ? i === lives - 1 : effect === 'loss' ? i === lives : false;
      if (changed) {
        var cls = effect === 'gain' ? 'is-gain' : 'is-hit';
        h.classList.remove(cls); void h.offsetWidth; h.classList.add(cls);   // relance l'animation
        setTimeout(function () { h.classList.remove(cls); }, 700);
      }
    });
    livesText.textContent = lives + (lives > 1 ? ' vies' : ' vie') + ' sur ' + MAX_LIVES;
  }

  /* ---------- Chronomètre ---------- */
  function tick() { timerEl.textContent = fmt(performance.now() - startTime); }
  function startTimer() {
    startTime = performance.now(); running = true; tick();
    timerId = setInterval(tick, 100);
  }
  function stopTimer() {
    elapsed = Math.round(performance.now() - startTime);
    running = false; clearInterval(timerId);
    timerEl.textContent = fmt(elapsed);
  }

  /* ---------- Déroulé d'une partie ---------- */
  function start() {
    if (!tables.length) return;
    score = 0; lives = MAX_LIVES; question = null; elapsed = 0; lastEntry = null;
    feedbackEl.textContent = '';
    updateScore(false);
    renderLives();
    show('jeu');
    newQuestion();
    startTimer();
    var first = choicesEl.querySelector('button');
    if (first) first.focus();
  }

  function finish() {
    show('fin');
    finTitle.textContent = 'Bravo, 3 étoiles ! 🥇';
    lostSummary.hidden = true;
    wonOnly.hidden = false;
    finalTimeEl.textContent = fmt(elapsed);
    finalTablesEl.textContent = '(' + tablesLabel(tables) + ')';
    savedEl.textContent = '';
    nameForm.hidden = false;
    nameInput.value = load(NAME_KEY, '');
    renderBoard(boardEl, tables.length, null);
    boardTitle.textContent = 'Les ' + TOP + ' meilleurs temps — ' + tables.length + (tables.length > 1 ? ' tables' : ' table');
    nameInput.focus();
  }

  // Plus aucune vie : écran « Partie perdue » avec le score et les étoiles obtenues, sans classement.
  function lose() {
    if (screens.jeu.hidden) return;   // partie arrêtée entre-temps
    show('fin');
    feedbackEl.textContent = '';
    var won = STARS.filter(function (st) { return score >= st.at; }).map(function (st) { return st.name; });
    finTitle.textContent = 'Partie perdue 💔';
    lostSummary.textContent = 'Plus de vies ! Bonnes réponses : ' + score + ' / ' + GOAL + '. ' +
      (won.length ? 'Étoile' + (won.length > 1 ? 's' : '') + ' obtenue' + (won.length > 1 ? 's' : '') + ' : ' + won.join(', ').replace(/, (\w+)$/, ' et $1') + '.'
        : 'Aucune étoile cette fois.');
    lostSummary.hidden = false;
    wonOnly.hidden = true;
    $('[data-again]').focus();
  }

  startBtn.addEventListener('click', start);
  $('[data-again]').addEventListener('click', function () { show('choix'); renderChips(); startBtn.focus(); });
  $('[data-quit]').addEventListener('click', function () {
    running = false; clearInterval(timerId);
    show('choix'); renderChips(); startBtn.focus();
  });

  /* ---------- Classements : 10 meilleurs temps par nombre de tables ---------- */
  function boards() { return load(BOARD_KEY, {}); }

  function addEntry(name) {
    var all = boards(), key = String(tables.length);
    var list = Array.isArray(all[key]) ? all[key] : [];
    var entry = { name: name, ms: elapsed, tables: tables.slice(), date: new Date().toISOString(), id: Date.now() + '-' + rand(1e6) };
    list.push(entry);
    list.sort(function (x, y) { return x.ms - y.ms; });
    list = list.slice(0, TOP);
    all[key] = list;
    var ok = save(BOARD_KEY, all);
    return { entry: entry, inTop: list.some(function (e) { return e.id === entry.id; }), rank: list.findIndex(function (e) { return e.id === entry.id; }) + 1, ok: ok };
  }

  // Affiche un classement dans un conteneur ; surligne la ligne highlightId.
  function renderBoard(container, count, highlightId) {
    var list = (boards()[String(count)] || []).slice(0, TOP);
    if (!list.length) {
      container.innerHTML = '<p class="et-empty">Aucun temps enregistré pour ' + count + (count > 1 ? ' tables' : ' table') + ' pour l’instant.</p>';
      return;
    }
    var table = document.createElement('table');
    table.className = 'et-board';
    table.innerHTML = '<caption class="visually-hidden">Meilleurs temps avec ' + count + (count > 1 ? ' tables' : ' table') + '</caption>' +
      '<thead><tr><th scope="col">#</th><th scope="col">Nom</th><th scope="col">Temps</th><th scope="col">Tables</th></tr></thead>';
    var tbody = document.createElement('tbody');
    list.forEach(function (e, i) {
      var tr = document.createElement('tr');
      if (e.id === highlightId) tr.className = 'is-me';
      [String(i + 1), e.name, fmt(e.ms), (e.tables || []).join(', ')].forEach(function (txt, k) {
        var cell = document.createElement(k === 0 ? 'th' : 'td');
        if (k === 0) cell.scope = 'row';
        cell.textContent = txt;          // textContent : un nom ne peut pas injecter de HTML
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  nameForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!name) { nameInput.focus(); return; }
    save(NAME_KEY, name);
    var r = addEntry(name);
    lastEntry = r.entry;
    nameForm.hidden = true;
    savedEl.textContent = !r.ok ? 'Impossible d’enregistrer sur cet appareil (stockage bloqué).'
      : r.inTop ? 'Enregistré ! Tu es ' + (r.rank === 1 ? '1er' : r.rank + 'e') + ' du classement.'
      : 'Enregistré, mais ce temps n’entre pas dans les ' + TOP + ' meilleurs.';
    renderBoard(boardEl, tables.length, r.entry.id);
  });

  boardSelect.addEventListener('change', function () { renderBoard(boardPreview, Number(boardSelect.value), null); });

  /* ---------- Démarrage ---------- */
  renderChips();
  boardSelect.value = String(tables.length || 1);
  renderBoard(boardPreview, Number(boardSelect.value), null);
  show('choix');

  // Accès pour les tests automatiques.
  window.__etoiles = {
    etat: function () { return { score: score, lives: lives, running: running, elapsed: elapsed, tables: tables.slice(), question: question && { a: question.a, b: question.b, good: question.good, choices: question.choices.slice() } }; },
    delaiErreur: function (ms) { WRONG_DELAY = ms; }
  };
})();
