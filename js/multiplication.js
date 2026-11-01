// Aventure des multiplications : petit jeu de plateforme 2D (canvas, sans dépendance).
// Le personnage court et saute ; on casse les caisses en les frappant par en dessous.
// Une caisse sur trois porte une multiplication égale au nombre à trouver (affiché sous le jeu).
// Le drapeau de fin s'ouvre quand toutes les bonnes caisses sont cassées.
// Avant chaque partie, le joueur choisit ses tables (1 à 10) ; le nombre à trouver
// est tiré au hasard dans ces tables et change à chaque partie lancée.
(function () {
  'use strict';

  /* ---------- Réglages ---------- */
  var W = 400, H = 240;            // taille logique de l'écran de jeu (mise à l'échelle ensuite)
  var GROUND = 200;                // hauteur du sol
  var GRAVITY = 1500, JUMP_V = 540, RUN_MAX = 170;
  var ACCEL_GROUND = 1400, ACCEL_AIR = 900, FRICTION = 1600;
  var HEARTS = 3;
  var BOX_W = 52, BOX_H = 30;

  // Niveaux : ajouter une entrée par nouveau niveau (décor, nombre de caisses…).
  // Le nombre à trouver n'est pas fixé ici : il est tiré au hasard à chaque partie.
  var LEVELS = [
    { boxes: 12 }                  // 12 caisses → 4 bonnes (1 sur 3)
  ];
  // v2 : les choix enregistrés avant la v2.6 (toutes les tables cochées par défaut) sont ignorés.
  var TABLES_KEY = 'ludoaventura-tables-v2';

  // Décor du niveau 1 (coordonnées du monde, en pixels logiques).
  var WORLD_W = 2600;
  var GROUNDS = [[0, 900], [980, 1720], [1800, 2600]];        // deux trous à sauter
  var BLOCKS = [                                              // marches en briques
    { x: 560, y: 160, w: 100, h: 40 },
    { x: 1300, y: 160, w: 110, h: 40 },
    { x: 2060, y: 160, w: 100, h: 40 }
  ];
  // Emplacements des caisses : « base » = surface sur laquelle se tient le joueur en dessous.
  var SLOTS = [
    { x: 200, base: GROUND }, { x: 340, base: GROUND }, { x: 584, base: 160 },
    { x: 770, base: GROUND }, { x: 1060, base: GROUND }, { x: 1180, base: GROUND },
    { x: 1329, base: 160 }, { x: 1510, base: GROUND }, { x: 1640, base: GROUND },
    { x: 1900, base: GROUND }, { x: 2084, base: 160 }, { x: 2270, base: GROUND }
  ];
  var FLAG_X = 2480;

  /* ---------- Éléments de la page ---------- */
  var canvas = document.querySelector('[data-canvas]');
  var ctx = canvas.getContext('2d');
  var overlay = document.querySelector('[data-overlay]');
  var stage = canvas.parentNode;
  var overlayTitle = document.querySelector('[data-overlay-title]');
  var overlayText = document.querySelector('[data-overlay-text]');
  var startBtn = document.querySelector('[data-start]');
  var heartsEl = document.querySelector('[data-hearts]');
  var foundEl = document.querySelector('[data-found]');
  var neededEl = document.querySelector('[data-needed]');
  var targetEl = document.querySelector('[data-target]');
  var levelEl = document.querySelector('[data-level]');
  var liveEl = document.querySelector('[data-live]');
  var tableBtns = Array.prototype.slice.call(document.querySelectorAll('[data-table]'));
  var allBtn = document.querySelector('[data-tables-all]');
  var tablesHint = document.querySelector('[data-tables-hint]');

  /* ---------- État du jeu ---------- */
  var levelIndex = 0, level, boxes, player, camX, hearts, found, needed, target = 0;
  var tables = loadTables();       // tables choisies par le joueur
  var status = 'ready';            // ready | playing | won | lost
  var particles = [], floats = [];
  var hintCooldown = 0, lastSafe = { x: 60, y: GROUND - 30 };
  var input = { left: false, right: false, jump: false };
  var jumpBuffer = 0, coyote = 0;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Toutes les multiplications possibles avec les tables choisies (ex. table de 7 : 7×1…7×10 et 1×7…10×7).
  function pairsFor(tbls) {
    var list = [];
    for (var a = 1; a <= 10; a++) {
      for (var b = 1; b <= 10; b++) {
        if (tbls.indexOf(a) >= 0 || tbls.indexOf(b) >= 0) list.push([a, b]);
      }
    }
    return list;
  }

  // Nouveau nombre à trouver, tiré dans les tables choisies, différent du précédent si possible.
  // On préfère les nombres qui s'obtiennent de plusieurs façons (caisses plus variées).
  function pickTarget(tbls, previous) {
    var count = {};
    pairsFor(tbls).forEach(function (pr) { var p = pr[0] * pr[1]; count[p] = (count[p] || 0) + 1; });
    var all = Object.keys(count).map(Number);
    var varied = all.filter(function (p) { return count[p] >= 2 && p !== previous; });
    var pool = varied.length ? varied : all.filter(function (p) { return p !== previous; });
    if (!pool.length) pool = all;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Tire les multiplications : exactement 1 caisse sur 3 donne le nombre cible.
  function makeBoxes(goal, count, tbls) {
    var nGood = Math.round(count / 3), nBad = count - nGood;
    var good = [], close = [], far = [];
    pairsFor(tbls).forEach(function (pr) {
      var p = pr[0] * pr[1];
      if (p === goal) good.push(pr);
      else if (Math.abs(p - goal) <= 15) close.push(pr);   // pièges proches du résultat
      else far.push(pr);
    });
    shuffle(good); shuffle(close); shuffle(far);
    var picks = [];
    for (var i = 0; i < nGood; i++) picks.push({ pair: good[i % good.length], correct: true });
    var bad = close.concat(far);
    for (var j = 0; j < nBad; j++) picks.push({ pair: bad[j % bad.length], correct: false });
    shuffle(picks);
    return SLOTS.slice(0, count).map(function (s, i) {
      return {
        a: picks[i].pair[0], b: picks[i].pair[1], correct: picks[i].correct, broken: false,
        x: s.x, y: s.base - 30 - 24 - BOX_H, w: BOX_W, h: BOX_H, bump: 0
      };
    });
  }

  function resetLevel() {
    level = LEVELS[levelIndex];
    // Sans table choisie (aperçu derrière l'écran de choix), on dessine un niveau avec toutes les tables.
    var tbls = tables.length ? tables : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    target = pickTarget(tbls, target);
    boxes = makeBoxes(target, level.boxes, tbls);
    needed = boxes.filter(function (b) { return b.correct; }).length;
    found = 0; hearts = HEARTS;
    player = { x: 60, y: GROUND - 30, w: 20, h: 30, vx: 0, vy: 0, onGround: true, face: 1, anim: 0, hurt: 0 };
    lastSafe = { x: 60, y: GROUND - 30 };
    camX = 0; particles = []; floats = [];
    targetEl.textContent = target;
    levelEl.textContent = levelIndex + 1;
    updateHud();
  }

  function updateHud() {
    heartsEl.textContent = '❤️'.repeat(hearts) + '🤍'.repeat(HEARTS - hearts);
    heartsEl.setAttribute('aria-label', 'Vies : ' + hearts + ' sur ' + HEARTS);
    foundEl.textContent = found;
    neededEl.textContent = needed;
  }

  function announce(text) { liveEl.textContent = text; }

  /* ---------- Écrans (début, victoire, défaite) ---------- */
  function showOverlay(title, text, button) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startBtn.textContent = button;
    overlay.hidden = false;
    stage.classList.add('is-menu');
    startBtn.focus();
  }

  function start() {
    if (!tables.length) return;
    resetLevel();                  // chaque partie lancée : nouveau nombre et nouvelles caisses
    status = 'playing';
    overlay.hidden = true;
    stage.classList.remove('is-menu');
    canvas.focus();
    announce('Niveau ' + (levelIndex + 1) + ' : casse les caisses qui font ' + target + '.');
  }

  function win() {
    status = 'won';
    showOverlay('Niveau réussi ! 🎉', 'Tu as trouvé les ' + needed + ' caisses qui font ' + target + '.', 'Rejouer');
    announce('Niveau réussi !');
  }

  function lose() {
    status = 'lost';
    showOverlay('Plus de cœurs !', 'Réessaie : de nouvelles caisses t’attendent.', 'Rejouer');
    announce('Plus de cœurs. Clique sur Rejouer.');
  }

  function loseHeart() {
    hearts--;
    player.hurt = 1;
    updateHud();
    if (hearts <= 0) lose();
  }

  /* ---------- Physique et collisions ---------- */
  function solids() {
    var list = GROUNDS.map(function (g) { return { x: g[0], y: GROUND, w: g[1] - g[0], h: 200 }; });
    list = list.concat(BLOCKS);
    boxes.forEach(function (b) { if (!b.broken) list.push({ x: b.x, y: b.y, w: b.w, h: b.h, box: b }); });
    return list;
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function hitBox(b) {
    b.broken = true;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    for (var i = 0; i < 10; i++) {
      particles.push({ x: cx, y: cy, vx: (Math.random() - .5) * 260, vy: -Math.random() * 300 - 60,
        life: 0.9, color: b.correct ? '#f2c14e' : '#a86d2c', size: 3 + Math.random() * 4 });
    }
    var calc = b.a + ' × ' + b.b + ' = ' + (b.a * b.b);
    if (b.correct) {
      found++;
      floats.push({ x: cx, y: b.y, text: '✓ ' + calc, color: '#1f7a45', t: 1.4 });
      announce('Bravo ! ' + calc + '. Caisses trouvées : ' + found + ' sur ' + needed + '.');
      updateHud();
    } else {
      floats.push({ x: cx, y: b.y, text: '✗ ' + calc, color: '#b3261e', t: 1.4 });
      announce('Raté : ' + calc + ', pas ' + target + '. Tu perds un cœur.');
      loseHeart();
    }
  }

  function step(dt) {
    var p = player;
    // Course : accélération vers la vitesse max, freinage quand rien n'est appuyé.
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var accel = p.onGround ? ACCEL_GROUND : ACCEL_AIR;
    if (dir) {
      p.vx += dir * accel * dt;
      p.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, p.vx));
      p.face = dir;
    } else if (p.onGround) {
      var f = FRICTION * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }

    // Saut : petite tolérance avant/après le sol pour que le saut « réponde » toujours.
    coyote = p.onGround ? 0.08 : Math.max(0, coyote - dt);
    jumpBuffer = Math.max(0, jumpBuffer - dt);
    if (jumpBuffer > 0 && coyote > 0) {
      p.vy = -JUMP_V; jumpBuffer = 0; coyote = 0; p.onGround = false;
    }
    if (!input.jump && p.vy < -220) p.vy = -220;  // relâcher tôt = saut plus court
    p.vy = Math.min(p.vy + GRAVITY * dt, 900);

    var list = solids();
    // Axe horizontal
    p.x += p.vx * dt;
    p.x = Math.max(0, Math.min(WORLD_W - p.w, p.x));
    list.forEach(function (s) {
      if (!overlap(p, s)) return;
      if (p.vx > 0) p.x = s.x - p.w; else if (p.vx < 0) p.x = s.x + s.w;
      p.vx = 0;
    });
    // Axe vertical
    p.y += p.vy * dt;
    p.onGround = false;
    var headHits = [];
    list.forEach(function (s) {
      if (!overlap(p, s)) return;
      if (p.vy > 0) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; }
      else if (p.vy < 0) {
        if (s.box) headHits.push(s);
        else { p.y = s.y + s.h; p.vy = 0; }
      }
    });
    if (headHits.length) {
      // On casse la caisse la plus au-dessus de la tête (plus grand recouvrement).
      headHits.sort(function (a, b) {
        var oa = Math.min(p.x + p.w, a.x + a.w) - Math.max(p.x, a.x);
        var ob = Math.min(p.x + p.w, b.x + b.w) - Math.max(p.x, b.x);
        return ob - oa;
      });
      p.y = headHits[0].y + headHits[0].h;
      p.vy = 60;
      hitBox(headHits[0].box);
      if (status !== 'playing') return;
    }
    if (p.onGround) lastSafe = { x: p.x, y: p.y };
    p.anim += Math.abs(p.vx) * dt;
    p.hurt = Math.max(0, p.hurt - dt);

    // Chute dans un trou : un cœur en moins, retour au dernier endroit sûr.
    if (p.y > H + 40) {
      announce('Tu es tombé ! Tu perds un cœur.');
      loseHeart();
      p.x = Math.max(0, lastSafe.x - 40 * p.face); p.y = lastSafe.y - 40; p.vx = 0; p.vy = 0;
      if (status !== 'playing') return;
    }

    // Drapeau de fin : il ne s'ouvre que si toutes les bonnes caisses sont cassées.
    if (p.x + p.w >= FLAG_X) {
      if (found >= needed) { win(); return; }
      hintCooldown -= dt;
      if (hintCooldown <= 0) {
        var left = needed - found;
        var msg = 'Encore ' + left + (left > 1 ? ' caisses' : ' caisse') + ' à trouver !';
        floats.push({ x: FLAG_X, y: GROUND - 140, text: msg, color: '#2f5bd3', t: 2 });
        announce(msg);
        hintCooldown = 2.5;
      }
    } else hintCooldown = 0;

    camX = Math.max(0, Math.min(WORLD_W - W, p.x - W * 0.4));
  }

  function updateEffects(dt) {
    particles.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += GRAVITY * dt; q.life -= dt; });
    particles = particles.filter(function (q) { return q.life > 0; });
    floats.forEach(function (f) { f.t -= dt; f.y -= 22 * dt; });
    floats = floats.filter(function (f) { return f.t > 0; });
  }

  /* ---------- Dessin ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function drawBackground() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6ec3ff'); g.addColorStop(1, '#c9ecff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Nuages (parallaxe lente)
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (var i = 0; i < 8; i++) {
      var x = ((i * 330 - camX * 0.3) % 1200 + 1200) % 1200 - 100, y = 30 + (i % 3) * 22;
      // Une forme par ellipse : évite les traits parasites entre les ellipses d'un même tracé.
      [[0, 0, 26, 10], [18, -6, 18, 10], [-16, -2, 14, 8]].forEach(function (e) {
        ctx.beginPath(); ctx.ellipse(x + e[0], y + e[1], e[2], e[3], 0, 0, Math.PI * 2); ctx.fill();
      });
    }
    // Collines (parallaxe moyenne)
    ctx.fillStyle = '#8fd17a';
    for (var k = 0; k < 10; k++) {
      var hx = k * 380 - camX * 0.5 + 60;
      if (hx < -200 || hx > W + 200) continue;
      ctx.beginPath(); ctx.ellipse(hx, GROUND + 10, 140, 70 + (k % 2) * 20, 0, Math.PI, 0); ctx.fill();
    }
  }

  function drawWorld() {
    // Sol : herbe + terre
    GROUNDS.forEach(function (gr) {
      var x = gr[0], w = gr[1] - gr[0];
      ctx.fillStyle = '#9b6233'; ctx.fillRect(x, GROUND, w, H - GROUND);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(x, GROUND, w, 9);
      ctx.fillStyle = '#7d4d27';
      for (var dx = x + 10; dx < x + w - 6; dx += 26) ctx.fillRect(dx, GROUND + 20 + (dx % 3) * 5, 5, 4);
    });
    // Marches en briques
    BLOCKS.forEach(function (b) {
      ctx.fillStyle = '#c4572f'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#8a3518'; ctx.lineWidth = 2;
      for (var row = 0; row < b.h / 10; row++) {
        ctx.beginPath(); ctx.moveTo(b.x, b.y + row * 10); ctx.lineTo(b.x + b.w, b.y + row * 10); ctx.stroke();
        for (var cx = b.x + (row % 2 ? 10 : 0); cx < b.x + b.w; cx += 20) {
          ctx.beginPath(); ctx.moveTo(cx, b.y + row * 10); ctx.lineTo(cx, b.y + row * 10 + 10); ctx.stroke();
        }
      }
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });
    // Drapeau : gris tant que toutes les bonnes caisses ne sont pas cassées
    var open = found >= needed;
    ctx.fillStyle = '#5b5b5b'; ctx.fillRect(FLAG_X, GROUND - 120, 5, 120);
    ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(FLAG_X + 2.5, GROUND - 122, 5, 0, 7); ctx.fill();
    ctx.fillStyle = open ? '#2fbf5b' : '#9aa3b2';
    ctx.beginPath(); ctx.moveTo(FLAG_X + 5, GROUND - 116); ctx.lineTo(FLAG_X + 45, GROUND - 104);
    ctx.lineTo(FLAG_X + 5, GROUND - 92); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(open ? '✓' : (needed - found), FLAG_X + 20, GROUND - 100);
  }

  function drawBox(b) {
    ctx.fillStyle = '#c98a3e'; roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
    ctx.strokeStyle = '#7a4a1c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#a86d2c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x + 3, b.y + 3); ctx.lineTo(b.x + b.w - 3, b.y + b.h - 3); ctx.stroke();
    // Étiquette avec la multiplication
    ctx.fillStyle = '#fff8e8'; roundRect(b.x + 4, b.y + 6, b.w - 8, b.h - 12, 3); ctx.fill();
    var txt = b.a + '×' + b.b, size = 14;
    ctx.fillStyle = '#2a1a08'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    do { ctx.font = '800 ' + size + 'px Inter, system-ui, sans-serif'; size--; }
    while (ctx.measureText(txt).width > b.w - 12 && size > 8);
    ctx.fillText(txt, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  // Le personnage « Pousse » : une petite boule verte avec une feuille sur la tête et une écharpe.
  function drawPlayer() {
    var p = player;
    if (p.hurt > 0 && Math.floor(p.hurt * 12) % 2) return;   // clignote quand il est touché
    var cx = p.x + p.w / 2, f = p.face;
    var leg = p.onGround && Math.abs(p.vx) > 5 ? Math.sin(p.anim / 6) * 3 : 0;
    ctx.fillStyle = '#2b2620';
    ctx.fillRect(cx - 7 + leg, p.y + p.h - 6, 5, 6);
    ctx.fillRect(cx + 2 - leg, p.y + p.h - 6, 5, 6);
    ctx.fillStyle = '#2fa36b'; roundRect(p.x - 1, p.y + 4, p.w + 2, p.h - 9, 9); ctx.fill();
    ctx.fillStyle = '#e8463a'; ctx.fillRect(p.x - 1, p.y + 16, p.w + 2, 4);
    ctx.fillRect(f > 0 ? p.x - 4 : p.x + p.w, p.y + 16, 5, 9);   // pan d'écharpe qui flotte derrière
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx + f * 3, p.y + 10, 4, 0, 7); ctx.arc(cx + f * 9, p.y + 10, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#1d2433';
    ctx.beginPath(); ctx.arc(cx + f * 4.5, p.y + 10.5, 1.8, 0, 7); ctx.arc(cx + f * 10, p.y + 10.5, 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#7ed957';
    ctx.beginPath(); ctx.ellipse(cx - f * 2, p.y + 1, 6, 3, -f * 0.6, 0, 7); ctx.fill();
  }

  function draw() {
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    drawBackground();
    ctx.save();
    ctx.translate(-Math.round(camX), 0);
    drawWorld();
    boxes.forEach(function (b) { if (!b.broken) drawBox(b); });
    particles.forEach(function (q) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); });
    drawPlayer();
    ctx.textAlign = 'center'; ctx.font = '800 13px Inter, system-ui, sans-serif'; ctx.lineWidth = 3;
    floats.forEach(function (f) {
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.strokeStyle = '#ffffff'; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- Boucle de jeu ---------- */
  var last = 0;
  function frame(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (status === 'playing') {
      // Petits pas de calcul pour des collisions fiables même si l'écran ralentit.
      var n = Math.ceil(dt / (1 / 120));
      for (var i = 0; i < n && status === 'playing'; i++) step(dt / n);
    }
    updateEffects(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- Commandes : clavier ---------- */
  var KEYS = {
    ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', Space: 'jump', KeyW: 'jump', KeyZ: 'jump'
  };
  function press(action, down) {
    if (action === 'jump' && down && !input.jump) jumpBuffer = 0.12;
    input[action] = down;
  }
  window.addEventListener('keydown', function (e) {
    var action = KEYS[e.code];
    if (!action || status !== 'playing') return;
    e.preventDefault();                      // pas de défilement de la page pendant le jeu
    if (!e.repeat) press(action, true);
  });
  window.addEventListener('keyup', function (e) {
    var action = KEYS[e.code];
    if (action) press(action, false);
  });
  window.addEventListener('blur', function () { input.left = input.right = input.jump = false; });

  /* ---------- Commandes : boutons tactiles ---------- */
  document.querySelectorAll('[data-pad]').forEach(function (btn) {
    var action = btn.getAttribute('data-pad');
    function down(e) { e.preventDefault(); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); press(action, true); btn.classList.add('is-down'); }
    function up() { press(action, false); btn.classList.remove('is-down'); }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  startBtn.addEventListener('click', start);

  /* ---------- Choix des tables (avant chaque partie) ---------- */
  function loadTables() {
    try {
      var saved = JSON.parse(localStorage.getItem(TABLES_KEY));
      if (Array.isArray(saved) && saved.length) {
        return saved.filter(function (n) { return n >= 1 && n <= 10; });
      }
    } catch (e) { /* stockage indisponible : aucun choix mémorisé */ }
    return [];                     // par défaut aucune table : le joueur allume celles qu'il veut
  }
  function saveTables() {
    try { localStorage.setItem(TABLES_KEY, JSON.stringify(tables)); } catch (e) { /* sans importance */ }
  }
  function renderTables() {
    tableBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', tables.indexOf(Number(btn.getAttribute('data-table'))) >= 0 ? 'true' : 'false');
    });
    var none = !tables.length;
    startBtn.disabled = none;
    tablesHint.textContent = none ? 'Touche une ou plusieurs tables pour jouer.' : '';
    allBtn.textContent = tables.length === 10 ? 'Aucune' : 'Toutes';
  }
  tableBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var n = Number(btn.getAttribute('data-table')), i = tables.indexOf(n);
      // Toutes les tables allumées : un clic sur un chiffre ne garde que celui-là
      // (sinon cliquer sur « 3 » éteindrait la table de 3 au lieu de la choisir).
      if (tables.length === 10) tables = [n];
      else if (i >= 0) tables.splice(i, 1);
      else tables.push(n);
      tables.sort(function (x, y) { return x - y; });
      saveTables(); renderTables();
    });
  });
  allBtn.addEventListener('click', function () {
    tables = tables.length === 10 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    saveTables(); renderTables();
  });

  /* ---------- Taille de l'écran de jeu (net sur écrans haute densité) ---------- */
  function resize() {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);

  /* ---------- Accès pour les tests automatiques ---------- */
  window.__jeu = {
    etat: function () {
      return {
        status: status, target: target, tables: tables.slice(), hearts: hearts, found: found, needed: needed,
        player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy, onGround: player.onGround },
        boxes: boxes.map(function (b) { return { a: b.a, b: b.b, correct: b.correct, broken: b.broken }; })
      };
    },
    // Place le personnage juste sous la caisse n° i (il retombe sur la surface en dessous).
    placerSous: function (i) {
      var b = boxes[i];
      player.x = b.x + b.w / 2 - player.w / 2; player.y = b.y + b.h + 2;
      player.vx = 0; player.vy = 0;
    },
    // Place le personnage juste avant le drapeau.
    placerAuDrapeau: function () { player.x = FLAG_X - 40; player.y = GROUND - 30; player.vx = 0; player.vy = 0; }
  };

  renderTables();
  resetLevel();
  targetEl.textContent = '?';      // le nombre est révélé au lancement de la partie
  resize();
  requestAnimationFrame(frame);
})();
