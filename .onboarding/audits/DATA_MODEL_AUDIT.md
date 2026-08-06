# Data Model — Audit

> Confiance : medium

## Compréhension globale

Ce dépôt ne possède aucun modèle de données local : pas d'entité, pas de schéma, pas de base de données, pas de stockage côté client (pas de `localStorage`, pas d'`IndexedDB`, pas de cookie). L'unique « donnée » manipulée est la ressource distante `transfer`, consommée depuis l'API `shift-pilot-resa-api` et jamais persistée localement. La confiance est `medium` non par lecture partielle, mais parce que la forme réelle de cette ressource distante n'a pas pu être observée — seuls les champs effectivement lus dans le code sont connus.

## Résumé exécutif

`shift-pilot-resa-web` possède un modèle de données minimal : un registre local des réservations. La ressource `transfer` (tableau JSON retourné par `GET /transfers`) est consommée, rendue, et stockée temporairement dans une `Map` locale (`reservations : Map<transferId, reservationId>`). Les cinq champs effectivement lus par `js/app.js` sont `id`, `from`, `to`, `price`, `seatsLeft` (`js/app.js`, lignes 20, 22, 28). Depuis SHIA-354, le champ `id` est critique : il sert de clé pour maintenir l'état applicatif des réservations actives pendant la session utilisateur.

**État applicatif** (SHIA-354) :
- `Map reservations` : maintient en mémoire les réservations actives pendant la session utilisateur (aucune persistance au-delà du rechargement)
- Périmètre : local au navigateur, pas de synchronisation multi-utilisateur
- Cycle de vie : initialisée vide au chargement, remplie par les appels `reserve()`, vidée par `cancelReservation()`

Les types attendus, le caractère obligatoire, et l'exhaustivité de la liste des champs `transfer` sont `INCONNU` — ils ne peuvent être établis que depuis le dépôt `shift-pilot-resa-api`. Aucune migration, aucune contrainte, aucun ORM. L'audit de modèle de données de ce workspace se réduit à documenter ce que le code *attend* de l'API et la nature du registre local.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Un modèle local minimal : la Map `reservations`.** Depuis SHIA-354, le code maintient un état applicatif en mémoire :
- `export const reservations = new Map();` (`js/app.js`, ligne 6) — registre session de réservations actives
- Clé : `transferId` (du champ `id` retourné par l'API)
- Valeur : `reservationId` (retourné par la réponse POST `/transfers/{id}/reserve`)
- Cycle de vie : mémoire volatille, perte au rechargement de la page
- Accès : remplie par `reserve()` (ligne 54), vidée par `cancelReservation()` (ligne 71), lue par `loadTransfers()` pour l'affichage des boutons (ligne 22)

Pas de stockage persistant (`localStorage`, `IndexedDB`, `cookie`), pas de synchronisation multi-utilisateur, pas de migration de données. Un modèle entièrement session-local.

**`VÉRIFIÉ_CODE` — La ressource `transfer` : cinq champs lus, forme complète inconnue.** `js/app.js` accède à cinq champs :
- `t.id` : utilisé comme clé `Map` pour les réservations (ligne 22) — **critique depuis SHIA-354**
- `t.from`, `t.to` : affichage du texte du transfert (ligne 20)
- `t.price` : affichage du prix (ligne 20)
- `t.seatsLeft` : affichage et logique conditionnelle pour le bouton Réserver (lignes 20, 28) — détermine si le bouton Réserver est affiché

Ces cinq champs sont les seuls utilisés par le code ; l'API peut en renvoyer davantage (horaires, compagnie, statut) sans que ce front en tire parti. Le type de `price` (nombre entier XPF ? décimal ? chaîne ?), le type de `id` (nombre entier ? UUID ? chaîne ?), et la sémantique de `seatsLeft` (0 = complet ? valeur négative possible ?) ne sont pas observables depuis ce dépôt. Statut : `VÉRIFIÉ_CODE` pour l'usage des cinq champs ; `INCONNU` pour la forme complète et les types exacts. **Note critique SHIA-354** : le champ `id` doit être présent, unique, et utilisable comme clé `Map` sans ambiguïté.

**`VÉRIFIÉ_CODE` — Aucune validation côté client.** Aucune garde sur la présence ou le type des cinq champs avant affichage (`js/app.js`, ligne 20) ni du `reservationId` retourné par l'API (`js/app.js`, ligne 54). Un champ absent produit `undefined` dans le rendu ; un champ de type inattendu (objet à la place d'un nombre) s'affiche tel quel (`[object Object]`). Il n'y a pas de schéma, pas de coerce, pas de valeur par défaut. Le front dépend implicitement d'un contrat non formalisé avec l'API. Depuis SHIA-354, la validation du `reservationId` retourné par POST `/transfers/:id/reserve` est critique pour le bon fonctionnement de l'annulation (DELETE).

**`VÉRIFIÉ_CODE` — Pas de gestion des données manquantes ni de l'état vide.** Si l'API renvoie un tableau vide, la boucle `for...of` s'exécute zéro fois — la `<ul>` reste vide sans message explicatif à l'utilisateur (`js/app.js`, lignes 18–36, `index.html`, ligne 9). Aucune distinction visuelle entre « erreur API » (catchée, affiche message) et « aucun transfert disponible » (silencieux).

## Forces

- **État applicatif minimal et session-local** : la `Map` de réservations ne persiste qu'en mémoire, pas de risque de corruption persistante. Aucune migration de données, aucune synchronisation multi-utilisateur à gérer côté front.
- **Aucune donnée personnelle dans ce dépôt** : le registre ne contient que des IDs de transfert et de réservation ; pas de PII visible, pas de stockage de profil utilisateur.
- **Simplicité de cycle de vie** : réservations jetées au rechargement, garantissant une cohérence locale triviale (pas de cache à invalider, pas de stale state).

## Dettes techniques

- **Contrat implicite et non formalisé avec l'API.** Les cinq champs attendus (`id`, `from`, `to`, `price`, `seatsLeft`) ne sont documentés nulle part dans ce dépôt — ni dans `README.md`, ni dans un fichier de types (TypeScript, JSDoc, JSON Schema). Si l'API évolue (renommage d'un champ, changement de type, suppression de `id`), le front casse silencieusement. Localisation : `js/app.js`, lignes 20–22, 28. **Note** : le champ `seatsLeft` est en accord avec l'API depuis SHIAAAAAAAAAAAAAAAAAAAAAAAA-311 ; le champ `id` est critique depuis SHIA-354 (clé de la `Map`).
- **Pas de validation du type de `id`.** Le champ `id` est supposé être un identifiant unique comparable avec `===` dans la `Map`, mais son type exact est inconnu (nombre entier ? UUID chaîne ?). Aucune garde sur la présence. Depuis SHIA-354, `id` est obligatoire pour la fonctionnalité de réservation. Localisation : `js/app.js`, ligne 22.
- **Pas de synchronisation multi-utilisateur.** Si deux utilisateurs réservent la dernière place simultanément, le front ne détecte pas le conflit. Aucun mécanisme de versioning, de polling ou de WebSocket pour synchroniser les changements d'autres utilisateurs. Localisation : front entier (responsabilité de l'API).
- **Aucune gestion de l'état vide.** Un tableau vide renvoyé par l'API (aucun transfert disponible) et une erreur réseau (catch) produisent deux résultats différents depuis SHIA-348 (message d'erreur), mais un tableau vide est silencieux. Localisation : `js/app.js`, lignes 18–40.

## Zones critiques

- **`js/app.js`, lignes 20, 22, 28 — accès direct aux champs sans validation** : c'est le seul endroit où le contrat avec l'API est exprimé, de façon implicite. Les cinq champs sont accédés sans garde :
  - Ligne 20 : `t.from`, `t.to`, `t.price`, `t.seatsLeft` (affichage du texte du transfert)
  - Ligne 22 : `t.id` (clé `Map` de réservations — **critique depuis SHIA-354**, détermine si le bouton Annuler est visible)
  - Ligne 28 : `t.seatsLeft > 0` (logique conditionnelle du bouton Réserver)
  
  Un senior regarderait ici pour évaluer la fragilité aux évolutions de l'API. **Audit noté le 2026-08-06** : contrat actuellement correct (`seatsLeft` et `id` lus = fournis par l'API). **Note critique** : le champ `id` doit être présent et utilisable comme clé `Map` sans ambiguïté depuis SHIA-354.

## Risques

- **`VÉRIFIÉ_CODE` — Rendu `undefined` silencieux si l'API modifie un nom de champ.** Un renommage de `seatsLeft` en `seats` dans l'API produirait `undefined places` dans chaque `<li>`, sans erreur. Idem pour `id` : si l'API renomme `id` en `transferId`, la clé `Map` serait `undefined` et chaque réservation échouerait silencieusement. **Note** : ce risque a frappé précédemment (bug SHIAAAAAAAAAAAAAAAAAAAAAAAA-311 : API exposait `seatsLeft`, front lisait `availableSeats`) et a été corrigé commit b6910ec.
- **`HAUT` — Suppression du champ `id` côté API.** Depuis SHIA-354, le champ `id` est obligatoire pour la fonctionnalité de réservation. Une suppression accidentelle côté API rendrait la réservation impossible sans crash manifeste (clés `Map` `undefined`).
- **`HAUT` — Conflit de réservation simultanée.** Si deux navigateurs réservent la dernière place en même temps, le front de chacun pense avoir réussi (état `Map` cohérent localement), mais l'API ne peut en servir qu'un. Aucune détection de conflit côté front ; synchronisation via rechargement manuel ou polling nécessaire.
- **`INCONNU` — Forme réelle et contraintes de la ressource `transfer`.** Les types, les valeurs limites et les éventuels champs obligatoires de `transfer` ne sont connus que depuis `shift-pilot-resa-api`. Si ce dépôt évolue (tri, filtre, affichage conditionnel), le développeur devra supposer ou consulter l'autre dépôt.

## Recommandations priorisées

1. **Documenter le contrat attendu avec l'API** dans `README.md` ou dans un commentaire JSDoc de `loadTransfers` : les cinq champs (`id`, `from`, `to`, `price`, `seatsLeft`), leurs types et leur caractère obligatoire. **Critique depuis SHIA-354** : le champ `id` est maintenant nécessaire pour la fonctionnalité de réservation (clé `Map` des réservations). Faible effort, forte valeur de maintenabilité. Fichier : `README.md`, `js/app.js`.
2. **Ajouter une validation ou une garde sur le type de `id`** — assurer que `id` est un identifiant unique utilisable comme clé `Map` et que `reservationId` retourné par l'API est également valide. Depuis SHIA-354, ces deux valeurs sont critiques pour la fonctionnalité de réservation/annulation. Localisation : `js/app.js`, lignes 22–27, 54–55, 71–72.
3. **Pas de synchronisation multi-utilisateur** — documenter explicitement dans `README.md` que les réservations sont session-locales, pas de détection de conflit en cas de réservation simultanée. Fichier : `README.md`, section déjà présente dans `CDC_FONCTIONNEL.md`.
4. **Ajouter un message explicite pour la liste vide** — distinguer « aucun transfert disponible » de « erreur de chargement ». Fichier : `js/app.js`, section de rendu (lignes 18–40) (optionnel, non critique).

## Questions ouvertes

- **Quel est le type réel et le format de `id` (nombre entier ? UUID chaîne ? autre ?) — CRITIQUE depuis SHIA-354** car utilisé comme clé `Map` et identifiant de transfert dans les endpoints de réservation. Non observable depuis ce dépôt, à établir depuis `shift-pilot-resa-api`. Impacte la robustesse de la Map et la cohérence entre les appels GET et POST/DELETE.
- **Quel est le type réel de `reservationId` retourné par POST `/transfers/:id/reserve` ? — CRITIQUE depuis SHIA-354** Doit-il être réutilisable dans DELETE `/transfers/:id/reservations/:reservationId` avec les mêmes paramètres ? Non observable depuis ce dépôt, impact direct sur l'annulation.
- Quels sont les types réels de `price` (nombre entier, décimal, chaîne formatée ?) et `seatsLeft` (entier, peut-il être négatif ?) — non observables depuis ce dépôt, à établir depuis `shift-pilot-resa-api`.
- L'API renvoie-t-elle d'autres champs (horaires, opérateur, statut de disponibilité) que ce front n'utilise pas ? Si oui, y a-t-il des fonctionnalités à venir qui les exploiteront ?
- La ressource `transfer` peut-elle être vide (aucun transfert disponible) ou l'API garantit-elle toujours au moins une entrée ?
