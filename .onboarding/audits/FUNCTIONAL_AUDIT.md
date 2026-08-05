# Functional — Audit

> Confiance : high

## Compréhension globale

`shift-pilot-resa-web` réalise exactement une fonctionnalité : afficher la liste des transferts inter-îles au chargement de la page, en consommant `GET /transfers` depuis `shift-pilot-resa-api`. Ce que la page dit être (« interface de réservation », `README.md`) et ce qu'elle fait réellement (catalogue en lecture seule) sont deux choses différentes. L'écart est documenté et assumé dans la carte des domaines — ce n'est pas un bug, c'est un périmètre de pilote qui n'a pas encore rattrapé son ambition déclarée.

## Résumé exécutif

Le dépôt implémente une seule fonctionnalité complète : le chargement et l'affichage d'une liste de transferts inter-îles (`js/app.js`, 20 lignes ; `index.html`, 12 lignes). Cette fonctionnalité est cohérente, fonctionnelle dans son périmètre, et couvre le chemin nominal sans aucun cas d'erreur. En dehors de ce périmètre, le `README.md` revendique une *« interface de réservation »* — aucun code de réservation n'existe (`grep` sur `reserv|booking|panier|cart|book|order|commande` → 0 résultat). Le delta entre l'ambition déclarée et l'implémentation réelle est entier : la consultation est faite, la réservation n'a pas commencé. L'expérience utilisateur est fonctionnelle mais sans filet : aucun message en cas d'erreur, aucun indicateur de chargement, aucun état vide explicite. Pour un pilote de test, la cohérence fonctionnelle est suffisante ; pour une mise en production, ces lacunes sont visibles par l'utilisateur final.

## Constats détaillés

**`VÉRIFIÉ_CODE` — Fonctionnalité implémentée : affichage du catalogue de transferts.** Au chargement de la page, `loadTransfers()` est déclenchée (`js/app.js`, ligne 19). Elle interroge `GET /transfers`, itère sur le tableau JSON reçu, et crée un `<li>` par transfert avec l'origine, la destination, le prix en XPF et le nombre de places disponibles (`js/app.js`, lignes 11–15). La fonctionnalité est intégralement couverte par le code visible — aucune dépendance cachée, aucun module manquant.

**`VÉRIFIÉ_CODE` — Fonctionnalité revendiquée mais absente : la réservation.** `README.md` désigne ce dépôt comme une *« interface de réservation de transferts inter-îles »*. Recherche explicite sur `reserv`, `booking`, `panier`, `cart`, `book`, `order`, `commande` dans `js/app.js` et `index.html` : 0 résultat. Aucun formulaire, aucun bouton de réservation, aucun appel POST ou PUT ne figure dans le code. Le champ `availableSeats` consommé (`js/app.js`, ligne 13) suggère que la disponibilité est une donnée pertinente pour une réservation — mais cette donnée est utilisée uniquement à des fins d'affichage. `HYPOTHÈSE` : la logique de réservation est prévue, soit dans ce dépôt (future itération), soit dans `shift-pilot-resa-api`, soit dans un troisième dépôt non identifié.

**`VÉRIFIÉ_CODE` — Aucun état de chargement visible pour l'utilisateur.** Entre le déclenchement de `loadTransfers()` et le rendu des `<li>` (`js/app.js`, lignes 6–15), la page affiche une `<ul>` vide sans indicateur de chargement (spinner, texte « Chargement… »). Sur une connexion lente ou vers une API distante, le délai est perceptible — l'utilisateur ne sait pas si la page charge ou si elle est vide.

**`VÉRIFIÉ_CODE` — Aucun état d'erreur explicite.** En cas d'échec de `fetch` (réseau indisponible, CORS bloquant, 5xx), l'exception non capturée laisse la page avec sa `<ul>` vide — identique à l'état initial et à l'état « liste vide renvoyée par l'API ». L'utilisateur ne peut pas distinguer ces trois cas.

**`VÉRIFIÉ_CODE` — Aucun état vide explicite.** Si l'API renvoie un tableau vide (aucun transfert disponible), la `<ul>` reste vide sans message. Un utilisateur ne saurait pas si c'est normal (aucun transfert ce jour) ou si la page est cassée.

**`VÉRIFIÉ_CODE` — L'unité monétaire XPF est codée en dur.** Le symbole `XPF` est intégré dans le template de `item.textContent` (`js/app.js`, ligne 13). Ce choix est cohérent avec le contexte Polynésie française et la nature pilote du projet, mais rend toute localisation ou changement de devise sans refactoring.

**`VÉRIFIÉ_CODE` — Affichage exhaustif sans limite.** Aucune pagination, aucun filtre, aucune limite du nombre de `<li>` rendus. Si l'API renvoie 500 transferts, 500 `<li>` sont créés et insérés dans le DOM sans défilement virtuel ni troncature. Ce choix est acceptable pour un petit catalogue ; il deviendrait un problème de performance et d'UX pour un catalogue large.

## Forces

- **Cohérence fonctionnelle sur le périmètre couvert.** Le flux de chargement et d'affichage est complet et sans ambiguïté — l'origine, la destination, le prix en XPF et les places disponibles sont correctement affichés pour chaque transfert retourné par l'API (`js/app.js`, lignes 11–15).
- **Déclenchement automatique au chargement.** Aucune interaction requise de l'utilisateur pour voir les transferts — l'expérience est immédiate dès que la page et l'API sont disponibles (`js/app.js`, ligne 19).

## Dettes techniques

- **Delta non comblé entre l'ambition déclarée et l'implémentation.** `README.md` revendique une interface de réservation ; le code ne couvre que la consultation. Ce delta n'est pas documenté dans le code ni dans le README comme un travail en cours. Localisation : `README.md`, ligne 3.
- **Absence de feedback utilisateur pour les états limites** (chargement, erreur, liste vide). Ces trois états produisent tous une `<ul>` vide, ce qui rend la page fonctionnellement opaque pour l'utilisateur. Localisation : `js/app.js`, lignes 9–15.

## Zones critiques

- **`js/app.js`, lignes 5–15 (la fonction `loadTransfers` entière)** : c'est la seule fonctionnalité du dépôt — tout ce qui s'y passe (ou ne s'y passe pas) est ce que l'utilisateur voit. Un senior évaluerait ici la complétude fonctionnelle : le chemin nominal fonctionne, les chemins d'erreur sont tous silencieux.

## Risques

- **`VÉRIFIÉ_CODE` — Opacité totale en cas d'échec.** Sans message d'erreur ni état de chargement, l'utilisateur ne dispose d'aucun indice en cas de panne. Ce risque est directement visible en production sur une connexion instable ou si l'API est indisponible.
- **`HYPOTHÈSE` — Fonctionnalité de réservation attendue mais non planifiée dans le dépôt.** Si la réservation doit être implementée côté front, l'architecture actuelle (un seul fichier, aucune structure) devra être refactorée avant le premier ajout. Le risque est celui d'un chantier d'ajout qui devient simultanément un chantier d'architecture.

## Recommandations priorisées

1. **Mettre à jour `README.md`** pour refléter l'état réel du dépôt : catalogue en lecture seule, réservation non implémentée. Evite la confusion pour tout développeur qui découvre le projet. Fichier : `README.md`.
2. **Ajouter des états explicites pour le chargement, l'erreur et la liste vide** dans `loadTransfers` — un texte temporaire pendant le chargement, un message d'erreur clair en cas d'échec, un « aucun transfert disponible » si le tableau est vide. Fichier : `js/app.js`, lignes 9–15.
3. **Définir le périmètre de la prochaine itération** (réservation ? filtres ? détail ?) avant d'ajouter du code — la structure actuelle accommode un ajout sans refactoring, mais seulement si celui-ci est petit. Un formulaire de réservation nécessite au minimum un module dédié.

## Questions ouvertes

- La fonctionnalité de réservation est-elle prévue dans ce dépôt ou dans `shift-pilot-resa-api` ? La réponse conditionne si ce front doit évoluer ou rester un catalogue en lecture seule.
- `availableSeats` : est-ce une donnée purement informative (affichage) ou une donnée à interpréter fonctionnellement (masquer les transferts complets, désactiver la réservation si `0`) ? Cette règle métier n'est pas visible dans le code actuel.
- La liste des transferts est-elle supposée se rafraîchir en live (polling, WebSocket) ou un rechargement de page est-il suffisant pour ce cas d'usage ?
