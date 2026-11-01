// Jeu de multiplication : une question à la fois (tables de 1 à 10).
// Après chaque réponse : message (bravo / correction), score mis à jour, question suivante.
(function () {
  'use strict';

  var MIN = 1, MAX = 10;
  var questionEl = document.querySelector('[data-question]');
  var form = document.querySelector('[data-form]');
  var input = form.querySelector('input');
  var feedback = document.querySelector('[data-feedback]');
  var scoreEl = document.querySelector('[data-score]');
  var totalEl = document.querySelector('[data-total]');

  var a = 0, b = 0, score = 0, total = 0;

  function rand() { return MIN + Math.floor(Math.random() * (MAX - MIN + 1)); }

  // Nouvelle question, différente de la précédente.
  function nextQuestion() {
    var na, nb;
    do { na = rand(); nb = rand(); } while (na === a && nb === b);
    a = na; b = nb;
    questionEl.textContent = a + ' × ' + b + ' = ?';
    // Facteurs exposés pour les tests automatiques.
    questionEl.dataset.a = a;
    questionEl.dataset.b = b;
    input.value = '';
  }

  function showFeedback(text, kind) {
    feedback.textContent = text;
    feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    if (!/^\d+$/.test(raw)) {
      showFeedback('Écris un nombre, puis valide.', '');
      input.focus();
      return;
    }
    var good = a * b;
    total++;
    if (parseInt(raw, 10) === good) {
      score++;
      showFeedback('Bravo ! ' + a + ' × ' + b + ' = ' + good, 'good');
    } else {
      showFeedback('Pas tout à fait : ' + a + ' × ' + b + ' = ' + good, 'bad');
    }
    scoreEl.textContent = score;
    totalEl.textContent = total;
    nextQuestion();
    input.focus();
  });

  nextQuestion();
})();
