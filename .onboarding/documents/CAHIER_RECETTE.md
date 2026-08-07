# CAHIER_RECETTE — shift-pilot-resa-web

Plan de test — parcours à valider pour accepter le produit.

## Contexte

Ce cahier de recette couvre les **trois fonctionnalités principales** de ce workspace (SHIA-354, SHIA-383) :
1. **Affichage du catalogue** — chargement de la page et affichage des transferts
2. **Réservation d'une place** — bouton Réserver et appel API POST
3. **Annulation d'une réservation** — bouton Annuler et appel API DELETE

Tous les tests sont dérivés des workflows documentés dans `CDC_FONCTIONNEL.md`.

**Confiance du cahier** : high — le code est exhaustif, le périmètre est clair.

**Périmètre non testé** (logique métier absente de ce dépôt) :
- Réservation de plusieurs places (limité à 1 seule place)
- Persistance des réservations au-delà de la session (pas d'implémentation)
- Synchronisation multi-utilisateur (pas d'implémentation)
- Filtres, tris, recherche (pas implémentés)
- Authentification (pas implémentée)

## Environnement de test

### Prérequis

1. **Accès à l'API** : `shift-pilot-resa-api` doit être en cours d'exécution et accessible
   - URL par défaut en développement : `http://localhost:3100`
   - URL configurable en production via injection de `window.API_BASE_URL`

2. **Navigateur web** : tout navigateur moderne supportant ES6 (Chrome, Firefox, Safari, Edge)

3. **Serveur HTTP** : les fichiers de ce dépôt doivent être servis via HTTP (pas de `file://` local — CORS)

### Configurations à tester

| Env | Où servir | API URL | Notes |
|-----|----------|---------|-------|
| **Développement** | Serveur local HTTP | `http://localhost:3100` | Fallback automatique sans injection |
| **Staging** | Serveur staging | À injecter via `window.API_BASE_URL` | Mécanisme d'injection à confirmer |
| **Production** | Serveur production | À injecter via `window.API_BASE_URL` | Mécanisme d'injection à confirmer |

## Test nominal — Cas heureux

### TC-01 : Affichage du catalogue au chargement

**Objectif** : Vérifier que la liste des transferts s'affiche correctement au chargement de la page.

**Contexte** : API est en cours d'exécution, accessible, et renvoie un tableau non-vide de transferts.

**Étapes**

1. Ouvrir la page `index.html` dans un navigateur (ou l'URL servie)
2. Attendre le rendu du DOM (< 1 sec. en local)
3. Vérifier que la liste est peuplée

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Le titre `<h1>Transferts</h1>` est visible | Présent sur la page |
| 2 | La `<ul id="transfers-list">` contient au moins une `<li>` | Une `<li>` par transfert |
| 3 | Chaque `<li>` affiche le format attendu | `[origine] → [destination] — [prix] XPF ([places] places)` |
| 4 | Les valeurs affichées correspondent aux données de l'API | Pas de corruption de données |
| 5 | L'affichage ne doit pas bloquer le navigateur | [HYPOTHÈSE] Observation sans outillage de mesure pour un catalogue de taille réduite (pilote) — critère de performance numérique non sourcé |

**Exemple de `<li>` attendue**
```
Papeete → Moorea — 3500 XPF (12 places)
```

**Acceptation** : Les 5 assertions passent.

---

### TC-02 : Contenu et formatage des transferts

**Objectif** : Vérifier que chaque transfert affiche correctement les 4 champs.

**Contexte** : API renvoie des transferts avec `from`, `to`, `price`, `seatsLeft`.

**Étapes**

1. Charger la page
2. Inspecter le premier transfert rendu
3. Vérifier chaque champ

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | `from` est affiché (avant la flèche →) | Visible, pas vide |
| 2 | `to` est affiché (après la flèche →) | Visible, pas vide |
| 3 | `price` est affiché suivi de ` XPF` | Format : `[nombre] XPF` |
| 4 | `seatsLeft` est affiché suivi de ` places` | Format : `[nombre] places` |
| 5 | Tous les transferts retournés par l'API sont affichés | Aucune omission, aucun doublon |

**Exemple de données API → rendu attendu**
```javascript
// API retourne
{ from: "Papeete", to: "Moorea", price: 3500, seatsLeft: 12 }

// Front affiche
<li>Papeete → Moorea — 3500 XPF (12 places)</li>
```

**Acceptation** : Les 5 assertions passent pour au moins 3 transferts.

---

## Tests de robustesse

### TC-03 : Résilience à l'erreur réseau

**Objectif** : Vérifier le comportement si l'API est injoignable.

**Contexte** : API n'est pas accessible (arrêtée, réseau inaccessible, CORS bloqué, etc.).

**Étapes**

1. Arrêter `shift-pilot-resa-api` ou bloquer sa connexion
2. Charger la page `index.html`
3. Attendre 5–10 secondes
4. Observer l'état de la page

**Comportement actuel** (non gardé, à documenter) :
- Page affiche une `<ul>` vide sans message
- Aucun message d'erreur visible dans l'interface
- Une erreur peut être visible dans la console du navigateur (DevTools)

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Une erreur réseau n'écrase pas la page (pas de crash) | **PASS** — pas de crash |
| 2 | Un message explicite est affiché à l'utilisateur | **PASS** — message d'erreur visible (SHIA-423) |
| 3 | La console JavaScript contient un indice d'erreur | **PASS** — erreur dans `fetch()` |

**Note** : La gestion des erreurs a été ajoutée par SHIA-423.

**Acceptation** : Les 3 assertions passent.

---

### TC-04 : Gestion d'une liste vide

**Objectif** : Vérifier le comportement si l'API renvoie un tableau vide.

**Contexte** : API renvoie `[]` (aucun transfert disponible ce jour).

**Étapes**

1. Configurer l'API pour retourner `[]`
2. Charger la page
3. Observer l'état

**Comportement actuel** :
- La `<ul>` reste vide
- Aucun message visible

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash, pas d'erreur JavaScript | **PASS** |
| 2 | Un message « Aucun transfert disponible » est affiché | **FAIL** — non implémenté |
| 3 | L'interface ne laisse pas penser qu'il y a un problème | **FAIL** — indéterminable : erreur ou absence légitime ? |

**Acceptation** : Pas de crash (assertion 1 passe). Les autres sont des recommandations.

---

### TC-05 : Résilience à un champ manquant

**Objectif** : Vérifier le comportement si un transfert manque l'un des 4 champs.

**Contexte** : API renvoie un transfert avec un champ absent ou `null`.

**Étapes**

1. Configurer l'API pour retourner :
   ```javascript
   { from: "Papeete", to: "Moorea", price: 3500 }
   // seatsLeft est absent
   ```
2. Charger la page
3. Observer le rendu du transfert

**Comportement actuel** :
- La `<li>` affiche : `Papeete → Moorea — 3500 XPF (undefined places)`
- Pas d'erreur JavaScript

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash | **PASS** |
| 2 | Pas de valeur `undefined` affichée | **FAIL** — `undefined` est visible |
| 3 | Le transfert est filtré ou marqué comme incomplet | **FAIL** — non implémenté |

**Acceptation** : Pas de crash, mais affichage dégradé (attendu en pilote).

**Recommandation** : Ajouter une validation ou documenter le contrat API.

---

## Tests de réservation et annulation

### TC-10 : Réservation d'une place

**Objectif** : Vérifier que l'utilisateur peut réserver une place sur un transfert disponible.

**Contexte** : API renvoie au moins un transfert avec `seatsLeft > 0` et un champ `id`.

**Étapes**

1. Charger la page
2. Attendre le rendu de la liste
3. Localiser un transfert avec `seatsLeft > 0`
4. Cliquer sur le bouton « Réserver »
5. Attendre le rafraîchissement de la liste

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Bouton « Réserver » est visible avant action | Visible pour transfert avec `seatsLeft > 0` |
| 2 | Clic déclenche une requête POST | Visible dans Network tab : `POST /transfers/{id}/reserve` |
| 3 | Bouton est remplacé par « Annuler » | UI mise à jour après succès |
| 4 | Nombre de places diminue de 1 | `seatsLeft` diminue après rafraîchissement |
| 5 | État local est mis à jour | Map `reservations` contient l'entrée `(transferId, reservationId)` |
| 6 | Pas d'erreur console | Aucun message d'erreur dans DevTools |

**Acceptation** : Les 6 assertions passent.

---

### TC-11 : Annulation d'une réservation

**Objectif** : Vérifier que l'utilisateur peut annuler sa réservation.

**Contexte** : Utilisateur a déjà réservé une place (après TC-10).

**Étapes**

1. Après TC-10, le bouton « Annuler » est visible
2. Cliquer sur le bouton « Annuler »
3. Attendre le rafraîchissement de la liste

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Bouton « Annuler » est visible après réservation | Visible pour transfert réservé |
| 2 | Clic déclenche une requête DELETE | Visible dans Network tab : `DELETE /transfers/{id}/reservations/{reservationId}` |
| 3 | Bouton est remplacé par « Réserver » | UI mise à jour après succès |
| 4 | Nombre de places augmente de 1 | `seatsLeft` augmente après rafraîchissement |
| 5 | État local est mis à jour | Map `reservations` ne contient plus l'entrée |
| 6 | Pas d'erreur console | Aucun message d'erreur dans DevTools |

**Acceptation** : Les 6 assertions passent.

---

### TC-12 : Absence du bouton Réserver si complet

**Objectif** : Vérifier que le bouton Réserver ne s'affiche pas quand `seatsLeft === 0`.

**Contexte** : API renvoie un transfert avec `seatsLeft === 0`.

**Étapes**

1. Charger la page
2. Attendre le rendu de la liste
3. Localiser un transfert avec `seatsLeft === 0`
4. Observer la présence/absence de boutons

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Bouton « Réserver » est absent | Aucun bouton pour transfert avec `seatsLeft === 0` |
| 2 | Transfert est affiché | Texte du transfert visible, juste pas de bouton |
| 3 | Texte affiche « 0 places » | Format : `... (0 places)` |

**Acceptation** : Les 3 assertions passent.

---

### TC-13 : Protection anti double-clic (SHIA-383)

**Objectif** : Vérifier que le double-clic rapide sur « Réserver » ou « Annuler » n'entraîne qu'un seul appel API.

**Contexte** : Utilisateur clique rapidement (< 500 ms) deux fois sur le même bouton pendant une opération réseau lente.

**Étapes**

1. Charger la page
2. Simul une latence réseau (DevTools > Network > Slow 3G)
3. Double-cliquer rapidement sur un bouton « Réserver » ou « Annuler »
4. Observer les appels réseau

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Un seul appel POST/DELETE est effectué | Network tab : une seule requête, pas deux |
| 2 | Bouton reste désactivé pendant l'opération | Pas de réactivité aux clics supplémentaires |
| 3 | État final est cohérent | Pas de doublon de réservation, pas d'annulation double |

**Acceptation** : Les 3 assertions passent. Démontre que `pendingTransfers` (Set) fonctionne correctement.

---

### TC-14 : Gestion d'erreur lors de la réservation (SHIA-423)

**Objectif** : Vérifier que les erreurs de réservation/annulation sont affichées à l'utilisateur.

**Contexte** : API retourne une erreur (4xx ou 5xx) ou est injoignable.

**Étapes**

1. Configurer l'API pour retourner une erreur 400 ou 500 sur `/reserve` ou `/reservations/{id}`
2. Charger la page
3. Cliquer sur « Réserver » ou « Annuler »
4. Observer l'affichage

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | Message d'erreur s'affiche dans `<p id="transfers-error">` | Texte d'erreur visible, ex. : « Impossible de réserver : Erreur serveur : 500 » |
| 2 | Bouton reste visible et peut être recliqué | Utilisateur peut réessayer après correction |
| 3 | Liste n'est pas rafraîchie | Pas de changement d'UI si l'API échoue |
| 4 | Transfert est déverrouillé | `pendingTransfers` est vidé même en cas d'erreur |

**Acceptation** : Les 4 assertions passent.

---

## Test d'intégration

### TC-06 : Cycle complet en environnement de staging

**Objectif** : Tester le déploiement complet en environnement de staging (proche production).

**Contexte** : Page servie depuis un serveur de staging, API configurée pour l'environnement.

**Étapes**

1. Vérifier que `window.API_BASE_URL` est correctement injectée
2. Charger la page
3. Vérifier que les transferts s'affichent
4. Inspecter la requête réseau dans DevTools (Network tab)

**Assertions**

| # | Assertion | Critère |
|---|-----------|---------|
| 1 | La variable `window.API_BASE_URL` contient l'URL attendue (non `localhost:3100`) | Visible dans la console : `console.log(window.API_BASE_URL)` |
| 2 | L'appel `fetch` est adressé à la bonne URL | Visible dans Network tab : `GET /transfers` vers le bon domaine |
| 3 | La réponse est 200 OK | Statut HTTP 200 |
| 4 | Les transferts s'affichent | Liste complète et formatée |

**Acceptation** : Les 4 assertions passent.

---

## Cas d'erreur API détaillés

### TC-07 : Réponse HTTP 500

**Objectif** : Vérifier le comportement si l'API renvoie une erreur serveur.

**Contexte** : API renvoie `HTTP 500 Internal Server Error` avec un corps JSON ou texte.

**Étapes**

1. Configurer un serveur mock pour retourner `500`
2. Charger la page
3. Observer

**Comportement actuel** :
- `response.ok` est vérifié
- Les erreurs sont capturées et affichées (depuis SHIA-423)

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash | **PASS** |
| 2 | Message d'erreur visible | **PASS** — Message d'erreur visible à l'utilisateur (SHIA-423) |

**Note** : Comportement corrigé par SHIA-423.

---

### TC-08 : Réponse avec format inattendu

**Objectif** : Vérifier si l'API retourne un objet ou `null` au lieu d'un tableau.

**Contexte** : API renvoie `{ error: "..." }` ou `null` au lieu d'un tableau.

**Étapes**

1. Configurer l'API pour retourner un objet ou `null`
2. Charger la page
3. Observer

**Comportement actuel** :
- La boucle `for (const t of transfers)` échoue
- `TypeError` non capturée

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash visible (erreur dans la console) | **FAIL** — crash en console |
| 2 | Message d'erreur visible pour l'utilisateur | **FAIL** |

**Note** : Comportement actuel = bug. Recommandation : valider `Array.isArray(transfers)`.

---

## Tests de performance (optionnels)

### TC-09 : Performance sur un grand catalogue

**Objectif** : Vérifier que le rendu reste fluide avec un grand nombre de transferts.

**Contexte** : API renvoie 1000+ transferts.

**Étapes**

1. Configurer l'API pour retourner 1000 transferts
2. Charger la page
3. Mesurer le temps de rendu

**Critères**
- Temps de rendu : < 1 seconde (objectif)
- Pas de freeze de l'interface
- Pas de crash navigateur

**Note** : Pas critique pour un pilote (catalogue petite taille attendue). À revisiter si le catalogue grandit.

---

## Checklist d'acceptation

| Test | Nominal | Robustesse | Intégration | Résultat |
|------|---------|-----------|------------|----------|
| TC-01 (Affichage) | ✓ | — | — | **À tester** |
| TC-02 (Formatage) | ✓ | — | — | **À tester** |
| TC-03 (Erreur réseau) | — | ✓ | — | Pas de crash (PASS), message absent (attendu) |
| TC-04 (Liste vide) | — | ✓ | — | Pas de crash (PASS), message absent (attendu) |
| TC-05 (Champ manquant) | — | ✓ | — | Pas de crash (PASS), affichage dégradé (attendu) |
| TC-10 (Réservation) | ✓ | — | — | **À tester** |
| TC-11 (Annulation) | ✓ | — | — | **À tester** |
| TC-12 (Complet) | ✓ | — | — | **À tester** |
| TC-13 (Anti-double-clic) | — | ✓ | — | **À tester** (SHIA-383) |
| TC-14 (Erreur réservation) | — | ✓ | — | **À tester** (SHIA-423) |
| TC-06 (Staging) | — | — | ✓ | **À tester en staging** |
| TC-07 (HTTP 500) | — | ✓ | — | Pas de crash (PASS), message absent (attendu) |
| TC-08 (Format inattendu) | — | ✓ | — | Crash en console (bug documenté) |
| TC-09 (Perf large) | — | — | ✓ | Optionnel, à revisiter si besoin |

## Recommandations pour améliorer la testabilité

1. **Documenter le contrat API** : quels sont les types exacts de `id` et `reservationId` ? Quels champs sont obligatoires ?
2. **Ajouter des tests unitaires/intégrés** : aucun test n'existe actuellement (pas de répertoire `test/`, pas de script `npm test`)
3. **Valider les données** : `Array.isArray(transfers)`, vérifier la présence et le type de `id`, valider `reservationId` retourné par l'API
4. **Améliorer la gestion d'erreur** : l'utilisateur ne peut pas distinguer « pas de transferts » d'« erreur API » (cas nominal accepté en pilote, à revoir en production)

## Régressions à surveiller

Avant toute modification du code, tester :

1. **Aucune modification d'`index.html`** : vérifier que les ids `transfers-list` et `transfers-error` restent inchangés, que le titre reste
2. **Aucune modification de l'URL API** : vérifier que l'appel cible toujours `${API_BASE_URL}/transfers`, `${API_BASE_URL}/transfers/{id}/reserve`, `${API_BASE_URL}/transfers/{id}/reservations/{reservationId}`
3. **Aucune modification de la structure des `<li>`** : vérifier que le format reste `[from] → [to] — [price] XPF ([seatsLeft] places)` — suite correctif SHIAAAAAAAAAAAAAAAAAAAAAAAA-311
4. **Aucune modification de la Map `reservations` ou du Set `pendingTransfers`** : vérifier que le registre local et la protection anti-double-clic restent
5. **Aucune modification de la police d'injection de `window.API_BASE_URL`** : documenter tout changement
6. **Vérifier que les boutons « Réserver » et « Annuler » s'affichent correctement** selon la logique : Réserver si `seatsLeft > 0` et pas réservé, Annuler si réservé
7. **Vérifier que les messages d'erreur s'affichent dans `<p id="transfers-error">`** (SHIA-423)

## Preuves et traçabilité

Les tests TC-10 à TC-14 (réservation, annulation, complet, anti-double-clic, erreur) sont nouveaux (SHIA-354, SHIA-383, SHIA-423) et couvrent les trois fonctionnalités principales du produit. Tous les tests sont dérivés des workflows documentés dans `CDC_FONCTIONNEL.md`, lui-même extrait des audits :
- FUNCTIONAL_AUDIT.md
- SECURITY_ROBUSTNESS_AUDIT.md
- CODE_HOTSPOTS_AUDIT.md
- DATA_MODEL_AUDIT.md
