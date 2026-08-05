# Functional — Audit

> Confiance : medium

## Compréhension globale

`shift-pilot-resa-web` s'auto-désigne *« interface de réservation de transferts inter-îles »* (`README.md:3`), mais le code actuel ne fait que **consulter et afficher** une liste de transferts. Aucune fonctionnalité d'interaction utilisateur n'est implémentée. La confiance est `medium` : le périmètre de ce dépôt est intégralement lisible et la lecture est certaine, mais la promesse fonctionnelle globale du projet (réservation) dépend de `shift-pilot-resa-api`, hors périmètre ici.

## Résumé exécutif

L'unique fonctionnalité présente est l'affichage d'une liste de transferts au chargement de page. Elle est correctement implémentée pour ce périmètre étroit : la page se charge, l'appel API est émis, les transferts sont affichés. En revanche, l'expérience utilisateur est embryonnaire : aucun état de chargement visible, aucun message d'erreur, aucun filtre, aucune pagination, aucune sélection. Le titre `README.md` promet une réservation qui n'existe nulle part dans ce workspace. Ce décalage entre la promesse (réservation) et l'implémentation (lecture seule) est le constat fonctionnel principal — il s'agit probablement d'un pilote volontairement limité, pas d'un oubli, mais ce n'est pas vérifiable depuis le code seul.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Fonctionnalité implémentée : affichage de la liste.** Au chargement de la page, `loadTransfers()` est déclenchée (`js/app.js:18-20`), appelle `GET ${API_BASE_URL}/transfers` (`js/app.js:6`), et remplit `<ul id="transfers-list">` avec un `<li>` par transfert au format `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` (`js/app.js:11-15`, `index.html:9`). C'est l'unique flux fonctionnel du dépôt.

**`VÉRIFIÉ_CODE` — Fonctionnalité absente : réservation.** `README.md:3` annonce une *« interface de réservation »*. Recherche `grep -niE "reserv|booking|panier|cart|book|order|commande|select|choisir|confirm"` sur `js/app.js` et `index.html` : 0 résultat. Aucun bouton de sélection, aucun formulaire, aucun appel POST, aucune modal, aucun état de confirmation n'existe. `HYPOTHÈSE` : la réservation est soit prévue mais non encore implémentée dans ce front, soit résidant uniquement dans `shift-pilot-resa-api` — aucune preuve dans ce workspace ne tranche.

**`VÉRIFIÉ_CODE` — Absence d'état de chargement.** Entre le `DOMContentLoaded` et la fin du fetch, la liste affichée est celle présente dans le HTML initial : `<ul id="transfers-list"></ul>` vide (`index.html:9`). Aucun spinner, aucun texte « Chargement… », aucun squelette (`js/app.js:5-16` — aucune manipulation DOM avant la ligne 10). L'utilisateur voit une liste vide sans savoir si la page charge ou si l'API est vide.

**`VÉRIFIÉ_CODE` — Absence d'état d'erreur.** Si le fetch échoue (API injoignable, CORS, JSON invalide), la liste reste vide et aucun message n'est affiché à l'utilisateur. L'erreur est visible uniquement dans la console développeur. Il n'existe aucune branche `catch` ni aucune logique d'affichage d'erreur dans le code (`js/app.js:5-16`).

**`VÉRIFIÉ_CODE` — Aucune interaction utilisateur au-delà du chargement.** `js/app.js` ne contient aucun `addEventListener` autre que sur `DOMContentLoaded` (`js/app.js:18-19`). Pas de filtre, de tri, de recherche, de sélection de transfert, de pagination, de bouton « rafraîchir ». L'utilisateur ne peut rien faire hormis lire la liste une fois chargée.

**`VÉRIFIÉ_CODE` — Chargement unique, pas de rafraîchissement.** `loadTransfers` est appelée une seule fois (`js/app.js:19`). Aucun `setInterval`, aucun `setTimeout`, aucun WebSocket n'existe. Si les disponibilités changent après le chargement initial, l'utilisateur ne le voit pas sans recharger la page manuellement.

**`VÉRIFIÉ_CODE` — Affichage de `availableSeats` sans signal de rupture.** Les places disponibles sont affichées telles quelles, même si la valeur est `0` (affichage : `0 places`). Aucun style particulier, aucune mention « complet », aucune exclusion des transferts à 0 place (`js/app.js:13`).

## Forces

- **Fonctionnalité principale réalisée et fonctionnelle** : l'affichage des transferts au chargement de page est implémenté correctement selon les informations disponibles. Pour un pilote de test, c'est l'objectif raisonnable.
- **Périmètre clair et honnête** : le code ne tente pas d'implémenter à moitié une réservation — soit une fonctionnalité est là, soit elle ne l'est pas. Pas de code mort, pas de branche inaccessible (`js/app.js`, intégralement lu).

## Dettes techniques

- **Décalage README / implémentation** : le `README.md` promet une réservation absente du code (`README.md:3` vs 0 résultat sur tout pattern de réservation). Ce décalage peut créer de fausses attentes chez un développeur ou un intégrateur qui découvrirait le dépôt.
- **Aucun retour utilisateur sur l'état de l'interface** : ni état de chargement, ni message d'erreur, ni état vide explicite (« Aucun transfert disponible ») — les trois états possibles de la liste se résolvent tous au même affichage : une liste vide.

## Zones critiques

- **`index.html` — absence d'états UI** : la structure HTML ne prévoit aucun emplacement pour un message de chargement, d'erreur ou d'absence de résultat (`index.html:1-12`). Tout ajout de ces états nécessiterait de modifier la structure HTML ou de les créer dynamiquement en JavaScript.

## Risques

- **Expérience utilisateur dégradée sans signalement** : en cas de défaillance API, l'utilisateur voit une liste vide, interprétable comme « aucun transfert disponible » plutôt que « erreur de chargement ». Ce risque est direct et se produit à chaque indisponibilité de l'API.
- **Transferts complets non distingués** : un transfert avec `availableSeats: 0` est affiché de façon identique à un transfert disponible. Un utilisateur peut tenter de réserver un transfert complet sans en être averti — si la réservation est jamais implémentée.

## Recommandations priorisées

1. **Ajouter un état de chargement et un état d'erreur** — Afficher un texte « Chargement… » avant le fetch et un message d'erreur en cas d'échec. Fichiers : `index.html` (ajout d'un `<p id="status">`) et `js/app.js` (manipulation de cet élément). Priorité : haute (impact direct sur la compréhension de l'interface par l'utilisateur).
2. **Corriger le `README.md`** — Soit décrire l'application comme *« interface de consultation »* en l'état actuel, soit documenter la réservation comme fonctionnalité planifiée. Fichier : `README.md`. Priorité : haute (évite les fausses attentes dès le premier `git clone`).
3. **Gérer visuellement les transferts à 0 place** — Ajouter une mention « Complet » ou filtrer les transferts indisponibles si la réservation est prévue. Fichier : `js/app.js`. Priorité : basse (à anticiper avant l'implémentation de la réservation).

## Questions ouvertes

- La fonctionnalité de réservation est-elle prévue dans ce dépôt front, ou résidera-t-elle entièrement dans `shift-pilot-resa-api` ? La réponse détermine si ce front est complet ou embryonnaire.
- L'affichage doit-il exclure les transferts à `availableSeats: 0`, ou les afficher avec un statut « Complet » ?
- Un rafraîchissement périodique de la liste est-il nécessaire selon le cas d'usage (les disponibilités changent-elles fréquemment pendant qu'un utilisateur consulte la page) ?
