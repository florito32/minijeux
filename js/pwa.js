// Installation PWA + mise à jour automatique.
// Vérifie la présence d'une nouvelle version au lancement ; si la vérification échoue
// (hors ligne…), la retente à la première interaction (clic, toucher, défilement, clavier).
(function () {
  'use strict';

  // Retour sur une page avec le bouton « précédent » : le navigateur peut la restaurer
  // telle qu'on l'a quittée (cache de navigation). On la recharge pour que le jeu
  // reparte toujours de zéro quand on revient d'un autre jeu.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) location.reload();
  });

  if (!('serviceWorker' in navigator)) return;
  // sw.js est à la racine du site, à côté du dossier js/ : on le localise depuis ce script
  // pour que l'enregistrement fonctionne depuis n'importe quelle page (accueil, aventures).
  var swUrl = new URL('../sw.js', document.currentScript.src).href;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl).then(function (reg) {
      reg.update().catch(function () {
        var events = ['click', 'touchstart', 'scroll', 'keydown'];
        function retry() {
          events.forEach(function (e) { window.removeEventListener(e, retry); });
          reg.update().catch(function () {});
        }
        events.forEach(function (e) { window.addEventListener(e, retry, { once: true, passive: true }); });
      });
    }).catch(function () {});
  });
})();
