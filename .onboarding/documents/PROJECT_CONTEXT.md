# PROJECT_CONTEXT — shift-pilot-resa-web

> **Statut** : pilote de test (opérationnel)  
> **Confiance globale** : high  
> **Taille de codebase** : très réduit (4 fichiers versionnés utiles : HTML + JS exécutable + tests + README ; `js/app.js` contient 90 lignes totales incluant logique métier, exports et structure ; 13 tests automatisés dans `js/app.test.js` couvrant les trois workflows clés)

## Nature et périmètre

`shift-pilot-resa-web` est une **interface web de consultation et réservation de transferts inter-îles** en Polynésie française. Le dépôt, déclaré comme un pilote de test SHIFT/Paperclip, fournit une page HTML statique qui affiche une liste de transferts en temps réel en interrogeant une API distante (`shift-pilot-resa-api`, dépôt séparé du même projet). Les utilisateurs peuvent consulter, réserver et annuler des réservations en un clic chacun.

**Ce que fait le produit** :
1. Afficher au chargement de la page une liste des transferts disponibles (origine, destination, prix en XPF, places disponibles)
2. Permettre à l'utilisateur de réserver une place via un bouton « Réserver » (livré SHIA-354)
3. Permettre à l'utilisateur d'annuler une réservation via un bouton « Annuler » (livré SHIA-354)
4. Rafraîchir automatiquement la liste après chaque action

**Ce que ne fait pas le produit** : persister les réservations en mémoire locale au-delà d'une session de navigateur, réserver plusieurs places en une action, synchroniser les réservations entre plusieurs utilisateurs en temps réel (détection de conflits).

## Domaines clés

Deux domaines opérationnels, tous deux de confiance documentée :

1. **Consultation et réservation de transferts** (cœur du produit)  
   Récupère et affiche la liste des transferts inter-îles depuis l'API ; permet à l'utilisateur de réserver et annuler une place en un clic (SHIA-354). C'est la **fonctionnalité complète** de ce workspace. Implémentation exhaustive dans `js/app.js` (90 lignes au total, incluant exports et structure, couvrant les workflows de chargement, réservation, annulation, et protection anti double-clic SHIA-383) et `index.html` (conteneur + lien script). Tests : 13 tests automatisés dans `js/app.test.js` couvrent tous les workflows clés en isolation (affichage, erreurs réseau/HTTP, réservation, annulation, double-clic, transitions d'état).

2. **Intégration API** (support technique)  
   Couche technique qui relie le front à `shift-pilot-resa-api` via configuration de l'URL de base (`window.API_BASE_URL`) et trois appels HTTP :
   - GET `/transfers` (lecture du catalogue)
   - POST `/transfers/{id}/reserve` (réservation, SHIA-354)
   - DELETE `/transfers/{id}/reservations/{reservationId}` (annulation, SHIA-354)
   
   Confiance haute : ces points de couplage sont clairement identifiés et stables. Le champ `id` est critique pour l'indexation des réservations.

## Contexte client

- **Région** : Polynésie française (devise XPF, liaisons inter-îles)
- **Cas d'usage** : consultation de catalogue sans interaction utilisateur — l'affichage est automatique au chargement de la page
- **Public** : voyageurs cherchant à connaître les transferts disponibles et leurs tarifs

## Points d'attention

### Écarts et incertitudes

1. **Persistance de réservations absente**  
   Les réservations sont enregistrées dans une Map JavaScript en mémoire (`reservations: Map<transferId, reservationId>`). Elles sont perdues au rechargement de page ou fermeture du navigateur. Cet état est assumé : le pilote teste la mécanique de réservation, pas sa persistance. Une future itération ajouterait `localStorage` ou une session utilisateur.

2. **Type du champ `id` indéterminable**  
   Le champ `id` est crucial pour l'indexation des réservations (clé de Map) mais son type et format exacts ne sont pas documentés. Observable seulement via l'API runtime (CRITIQUE depuis SHIA-354).

3. **Robustesse améliorée (SHIA-348)**  
   La gestion d'erreur a été améliorée : si l'API échoue, la page affiche maintenant un message d'erreur visible aux utilisateurs. Ce changement rend le produit plus fiable en production (message : « Impossible de charger les transferts : [détail] »).

4. **Configuration d'URL non documentée**  
   L'URL de l'API est injectée via `window.API_BASE_URL`. Le mécanisme d'injection en production n'est pas versionné dans ce dépôt (probablement côté serveur ou build) — cela crée une dépendance tacite en dehors du périmètre versionnés (INCONNU depuis ce dépôt).

5. **Protection anti double-clic (SHIA-383)**  
   Un Set `pendingTransfers` verrouille chaque transferId pendant un appel réseau. Les clics supplémentaires sont ignorés jusqu'à la fin de la requête. Cet mécanisme empêche les réservations accidentelles multiples (couvert par tests automatisés).

### Dépendances

- **`shift-pilot-resa-api`** (API distante, endpoints `/transfers`, `/transfers/:id/reserve`, `/transfers/:id/reservations/:reservationId`)  
  Forme réelle du transfert (au-delà des cinq champs affichés) non observable depuis ce dépôt. Contrat implicite avec la structure retournée. Comportement après réservation/annulation (décrément/réaugmentation de `seatsLeft`) : **INCONNU** depuis ce dépôt.

## Architecture et technologie

- **Stack** : HTML5 + JavaScript natif (zéro dépendance, zéro build, zéro framework)
- **Modèle de données** : aucune persistance locale (localStorage/sessionStorage/indexedDB) ; deux états clients éphémères exportés et testés :
  - Map `reservations` (transferId → reservationId) — enregistre les réservations actives de la session
  - Set `pendingTransfers` (transferId → booléen) — verrouille chaque transferId pendant un appel réseau (protection anti double-clic SHIA-383)
  - Tous deux perdus au rechargement de page
- **Structure** : une page unique, trois fonctions exportées (`loadTransfers`, `reserve`, `cancelReservation`), deux appels API (GET, POST/DELETE)
- **Déploiement** : fichiers statiques (HTML, JS) servis via HTTP, configuration d'URL de base injectée ou fallback automatique

Cet état ultra-minimal est cohérent avec le statut pilote. Toute extension (filtres, réservation, détail) nécessiterait une refactorisation légère mais structurante avant d'être ajoutée.

## Preuves et confiance

- **Confiance globale : high**
  - **High** sur la portée réelle du code : les 4 fichiers versionnés (README, HTML, JS exécutable, tests) ont été ouverts en entier — aucune « boîte noire », lecture exhaustive. 13 tests automatisés dans `js/app.test.js` validant le code.
  - **High** sur les workflows : réservation et annulation sont implémentées et testées en isolation (SHIA-354 ; couverture du code et logique métier documentée dans les workflows).
  - **Medium** sur la forme réelle de l'API distante : seuls les 5 champs consommés et leurs comportements après réservation/annulation sont observables ; d'autres champs ou contraintes peuvent exister côté serveur.
  - **Medium** sur le contexte de déploiement : mécanisme d'injection de configuration non versionné, comportement en production repose sur un savoir externe.

- **Documents de référence amont**  
  Tous les constats ci-dessus sont issus de :
  - CARTE_DES_DOMAINES.md (structure métier)
  - WORKFLOW_AFFICHAGE_TRANSFERTS.md, WORKFLOW_RESERVER_TRANSFERT.md, WORKFLOW_ANNULER_RESERVATION.md (flux détaillés)
  - FUNCTIONAL_AUDIT.md (ce qui existe et ce qui manque)
  - ARCHITECTURE_AUDIT.md (structure technique et risques)
  - CODE_HOTSPOTS_AUDIT.md (points fragiles du code)
  - DATA_MODEL_AUDIT.md (contrats et données)
  - TESTING_AUDIT.md (couverture des 13 tests automatisés)
  - SECURITY_ROBUSTNESS_AUDIT.md (robustesse réseau et injection)

## Recommandations de priorité

Pour une mise en production en l'état (pilote → production) :

1. **Valider le type du champ `id`** : interroger l'équipe API pour documenter le format exact (CRITIQUE depuis SHIA-354)
2. **Documenter le mécanisme d'injection de `window.API_BASE_URL`** : s'assurer que le mécanisme en production est robuste et testé
3. **Tests existants** : 13 tests automatisés dans `js/app.test.js` couvrent les workflows clés (affichage, réservation, annulation, protection double-clic SHIA-383). Exécutables via `npm test`. Une suite de recette manuelle reste nécessaire avant production (navigateur réel, API réelle, multi-navigateur, multi-domaine).
4. **Documenter la limite de persistance** : clarifier dans le README que les réservations ne sont pas persistées entre sessions
5. **Surveiller la gestion d'erreur en production** : les messages sont génériques (« Impossible de charger »), peut être améliorés pour distinguer chaque type d'erreur

**Statut et confiance** — Implémenté et testé en isolation, avec limites connues. L'absence de dépendances externes et la taille réduite du code limitent les risques d'intégration. Les trois fonctionnalités (consultation, réservation, annulation) sont implémentées dans `js/app.js` (90 lignes), couvertes par 13 tests unitaires automatisés dans `js/app.test.js`, et protégées contre les double-clics (SHIA-383). Les zones non testées ou non observables sont documentées dans les audits (notamment : câblage `DOMContentLoaded` réel, comportement serveur après réservation/annulation, synchronisation multi-utilisateur, injection de `window.API_BASE_URL` en production, format exact de `id` et `reservationId`, validation côté API de `seats >= 1`). La mise en production nécessite : test du contrat API (décrément de `seatsLeft`, validation de `seats`), validation du mécanisme d'injection en staging, recette manuelle navigateur réel avec API réelle, et test multidomaine (frontend et API sur origines différentes).
