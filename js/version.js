// Numéro de version du site + historique des changements.
// À chaque mise en ligne : incrémenter VERSION et ajouter une entrée en tête de HISTORY.
// Le badge s'insère dans tout élément portant l'attribut [data-version].
(function () {
  'use strict';

  var VERSION = '2.6';

  var HISTORY = [
    { v: '2.6', date: '2026-11-01', changes: [
      'Puissance 4 : en revenant d\u2019un autre jeu, en rechargeant ou en rouvrant l\u2019application, la partie et les scores repartent de zéro.'
    ] },
    { v: '2.5', date: '2026-11-01', changes: [
      'L\u2019onglet Multiplication ouvre une page avec les jeux de multiplication en vignettes.',
      'Le jeu de plateforme devient la première vignette (adresse : /multiplication/aventure/), avec un lien de retour.'
    ] },
    { v: '2.4', date: '2026-11-01', changes: [
      'Puissance 4 : les emplacements ne bougent plus sur téléphone quand un jeton tombe.'
    ] },
    { v: '2.3', date: '2026-11-01', changes: [
      'Avant chaque partie, choisis tes tables de multiplication (1 à 10) ; ton choix est mémorisé.',
      'Le nombre à trouver change à chaque partie lancée, tiré dans les tables choisies.',
      'Bouton « Sur téléphone » (sur ordinateur) : un QR code pour ouvrir le site sur un téléphone.'
    ] },
    { v: '2.2', date: '2026-11-01', changes: [
      'Nouveau jeu : Puissance 4, dans un nouvel onglet.',
      'Contre l\u2019ordinateur avec 3 niveaux (Facile, Moyen, Difficile) ou à deux sur le même téléphone.',
      'Jetons rouges et jaunes, scores, partie en cours sauvegardée, jouable au clavier.'
    ] },
    { v: '2.1', date: '2026-11-01', changes: [
      'Le jeu de multiplication devient une aventure 2D : un personnage court et saute.',
      'On casse par en dessous les caisses dont la multiplication donne le nombre affiché en bas (1 caisse sur 3).',
      'Niveau 1 : 3 cœurs, mauvaise caisse ou chute = un cœur en moins ; drapeau de fin ouvert quand toutes les bonnes caisses sont trouvées.',
      'Commandes au clavier et boutons tactiles sur téléphone et tablette.'
    ] },
    { v: '2.0', date: '2026-11-01', changes: [
      'Ludoaventura devient un site de petits jeux : tout le contenu sur les éléphants est retiré.',
      'Nouvelle barre d\u2019onglets en haut de page, un onglet par jeu.',
      'Premier jeu : les tables de multiplication (1 à 10), avec score.'
    ] },
    { v: '1.5', date: '2026-10-27', changes: [
      'Éléphants : chaque chiffre renvoie à sa source, nouvelle section « Sources ».',
      'Chiffres corrigés d\u2019après les sources (nourriture ≈ 150 kg/jour, eau 100–200 L, sommeil ≈ 2 h, trompe ≈ 90 000 faisceaux musculaires…).'
    ] },
    { v: '1.4', date: '2026-10-27', changes: [
      'Accessibilité : contrastes des couleurs renforcés, focus clavier visible, lien « Aller au contenu ».',
      'Référencement : adresse canonique, aperçus de partage, plan du site.'
    ] },
    { v: '1.3', date: '2026-10-27', changes: [
      'Nouvelle page d\u2019accueil Ludoaventura qui présente les aventures.',
      'Le monde des éléphants devient la première aventure (adresse : /elephants/).'
    ] },
    { v: '1.2', date: '2026-10-27', changes: [
      'Site installable comme une application sur iPhone et Android (PWA).',
      'Mise à jour automatique au lancement et consultation possible hors ligne.'
    ] },
    { v: '1.1', date: '2026-10-27', changes: [
      'Affichage du numéro de version ; un clic ouvre cet historique.',
      'Tests automatiques sur téléphone, tablette et ordinateur à chaque modification.'
    ] },
    { v: '1.0', date: '2026-10-27', changes: [
      'Première page : le monde des éléphants (espèces, alimentation, journée type, protection).'
    ] }
  ];

  // Construit la fenêtre d'historique (élément <dialog> natif, accessible au clavier).
  function buildDialog() {
    var dialog = document.createElement('dialog');
    dialog.className = 'version-dialog';
    dialog.setAttribute('aria-labelledby', 'version-title');

    var html = '<h2 id="version-title">Historique des versions</h2><ol class="version-list">';
    HISTORY.forEach(function (item) {
      html += '<li><h3>v' + item.v + ' <time datetime="' + item.date + '">' +
        new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) +
        '</time></h3><ul>';
      item.changes.forEach(function (c) { html += '<li>' + c + '</li>'; });
      html += '</ul></li>';
    });
    html += '</ol><form method="dialog"><button class="version-close">Fermer</button></form>';
    dialog.innerHTML = html;

    // Clic sur le fond (hors contenu) : fermeture.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function init() {
    var slots = document.querySelectorAll('[data-version]');
    if (!slots.length) return;
    var dialog = buildDialog();
    slots.forEach(function (slot) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'version-badge';
      // Texte visible « v1.x » + précision réservée aux lecteurs d'écran.
      btn.innerHTML = 'v' + VERSION + '<span class="visually-hidden"> — historique des versions</span>';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', function () { dialog.showModal(); });
      slot.appendChild(btn);
    });
  }

  window.SITE_VERSION = VERSION;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
