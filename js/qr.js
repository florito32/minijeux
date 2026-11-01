// Bouton « Sur téléphone » : ouvre la fenêtre avec le QR code du site.
(function () {
  'use strict';
  var btn = document.querySelector('[data-qr-open]');
  var dialog = document.querySelector('[data-qr-dialog]');
  if (!btn || !dialog) return;
  btn.addEventListener('click', function () { dialog.showModal(); });
  // Clic sur le fond (hors contenu) : fermeture.
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
})();
