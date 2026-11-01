# BACKLOG — ludoaventura

> Depuis v2.0 (1er novembre 2026), Ludoaventura est un site de **petits jeux** avec une barre d'onglets. Les lignes 1–18 concernent l'ancienne version (éléphants, retirée).

Statuts : à faire / en cours / fait à valider / terminé / question en attente

| # | Instruction | Statut | Tests |
|---|-------------|--------|-------|
| 1 | Accéder au dépôt GitHub et lire CLAUDE.md / BACKLOG.md | terminé (les fichiers n'existaient pas) | — |
| 2 | Appliquer les instructions de travail : créer CLAUDE.md et BACKLOG.md | terminé (PR #1 fusionnée) | — |
| 3 | Afficher le numéro de version sur la page + historique au clic | fait à valider (v1.1, pied de page, PR #4) | ✅ 16/16 en local + CI + test en ligne |
| 4 | Mettre en ligne sur GitHub Pages | terminé (déjà actif depuis `main` : https://florito32.github.io/ludoaventura/) | test en ligne automatique après chaque déploiement (workflow « Test en ligne ») |
| 5 | Rendre le site installable (PWA) avec mise à jour automatique | fait à valider (v1.2, PR #5 : manifeste, icônes, service worker réseau d'abord, hors ligne) | ✅ 24/24 en local + CI + test en ligne |
| 6 | Tests Playwright (parcours, mobile / tablette / ordinateur) + GitHub Actions sur chaque PR | terminé (PR #3) | ✅ 12/12 en local (téléphone, téléphone carré, tablette, ordinateur) |
| 7 | Vérifier SEO et accessibilité de la page actuelle | fait à valider (v1.4, PR #7 : accent assombri #9a4e1a pour contraste ≥ 4,5:1 WCAG AA, focus visible, lien d'évitement, canonical, Open Graph, robots.txt, sitemap.xml) | ✅ 65/65 en local, audit axe-core WCAG 2.1 A/AA clair + sombre, CI |
| 8 | Sourcer les chiffres et affirmations de la page « éléphants » | fait à valider (v1.5 : 12 sources, renvois [n] ; chiffres corrigés : nourriture 100–300 → ≈ 150 kg, eau 70–200 → 100–200 L, digestion « 40 % » → « moins de la moitié », sommeil 2–4 h → ≈ 2 h sauvage, poids 6 → ≈ 6,8 t, longévité 60–70 → 50–70 ans, mâles 12–15 → 12–18 ans, trompe → ≈ 90 000 faisceaux ; « comportement face aux morts » retiré faute de source vérifiée). À valider : certaines sources sont des sites de vulgarisation (SeaWorld, IFAW…), le conteneur n'a pas pu ouvrir les pages pour relecture directe | ✅ 69/69 en local |
| 9 | Clarifier l'objectif du site : le dépôt s'appelle « ludoaventura » mais la page parle d'éléphants | terminé : Ludoaventura = collection d'aventures, les éléphants sont la 1re | — |
| 10 | Rétablir l'accès GitHub en écriture | terminé (app Claude installée, push + PR + fusion OK) | — |
| 11 | Claude fusionne toujours lui-même les PR | terminé (noté dans CLAUDE.md) | — |
| 12 | Autorisation complète : créer, modifier, copier, supprimer (code, fichiers, branches, PR) | terminé (noté dans CLAUDE.md) | — |
| 13 | Réveil automatique après une limite d'utilisation + reprise des messages de la nuit | terminé (tâche planifiée toutes les 2 h, noté dans CLAUDE.md) | — |
| 14 | Mettre à jour CLAUDE.md sur GitHub | terminé (PR #2) | — |
| 15 | Supprimer les branches fusionnées `claude/setup-instructions` et `claude/claude-md-autonomie` | question en attente : suppression refusée par le proxy des sessions cloud (API et git push) — à supprimer à la main sur GitHub + `claude/jeux-multiplication` (même blocage) | |
| 16 | « Go » : reprendre tout le backlog en autonomie | terminé (v1.1 → v1.5 livrées) | ✅ |
| 17 | Structurer le site : accueil Ludoaventura + page éléphants comme 1re aventure | fait à valider (v1.3, PR #6) — hypothèses à valider : adresse `/elephants/`, carte « Prochaine aventure » sur l'accueil, CSS commun `css/site.css` | ✅ 36/36 en local + CI |
| 18 | Accélérer la CI (image officielle Playwright au lieu de l'installation de Chromium) | fait à valider | ✅ |
| 19 | Changer de thème : supprimer tout le contenu sur les éléphants | fait à valider (v2.0 : page `/elephants/`, icône éléphant, styles et tests associés retirés ; l'historique des versions garde la mention des anciennes versions) | ✅ 52/52 en local + CI (axe-core inclus) + test en ligne (PR #9) |
| 20 | Garder des onglets pour créer des petits jeux | fait à valider (v2.0 : barre d'onglets en haut de chaque page, choix validé « barre d'onglets en haut » ; l'adresse racine ouvre directement le 1er onglet) | ✅ local + CI + test en ligne |
| 21 | Commencer une page « jeu de multiplication » | fait à valider (v2.0, `/multiplication/`) — hypothèses à valider : tables de 1 à 10, questions au hasard, saisie au clavier numérique, score « bonnes réponses / total », correction affichée en cas d'erreur, nouvelle couleur bleue et nouvelle icône « × » | ✅ local + CI + test en ligne |
| 22 | Attendre les nouvelles instructions de l'utilisateur pour le jeu de multiplication | terminé (instructions reçues, lignes 25–30) | — |
| 23 | Tâche planifiée de reprise pour cette session | terminé (nouvelle tâche toutes les 2 h ; l'ancienne, liée à la session précédente, est désactivée) | — |
| 24 | « Débrouille-toi, je ferai des changements si besoin » : avancer avec des hypothèses raisonnables | terminé (règle appliquée, hypothèses notées « à valider ») | — |
| 25 | Rendre le jeu plus ludique : aventure 2D façon jeu de plateforme | fait à valider (v2.1, PR à venir) — hypothèses : décor ciel/collines/sol, deux trous à sauter, trois marches en briques, drapeau de fin | ✅ 59/59 en local |
| 26 | Un personnage qui court et qui saute | fait à valider — personnage original « Pousse » (boule verte, feuille, écharpe rouge) ; clavier ← → / Espace ↑, boutons tactiles ◀ ▶ Sauter | ✅ 59/59 en local |
| 27 | En bas, un nombre à trouver | fait à valider — « Nombre à trouver » affiché sous l'écran de jeu | ✅ 59/59 en local |
| 28 | Éclater des caisses portant une multiplication ; 1 caisse sur 3 correspond au nombre | fait à valider — 12 caisses dont 4 justes ; on casse en sautant par en dessous ; mauvaise caisse ou chute = −1 cœur (3 cœurs) ; le drapeau ne s'ouvre qu'avec toutes les bonnes caisses ; pièges choisis proches du nombre | ✅ 59/59 en local |
| 29 | À chaque niveau, le nombre en bas change | fait à valider — liste `LEVELS` dans js/multiplication.js : un nombre par niveau | ✅ 59/59 en local |
| 30 | Pour l'instant, un seul niveau | fait à valider — niveau 1 : nombre 24 ; caisses tirées au hasard à chaque partie | ✅ 59/59 en local |
