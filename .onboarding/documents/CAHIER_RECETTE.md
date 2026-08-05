# CAHIER_RECETTE — shift-pilot-resa-web

Plan de test — parcours à valider pour accepter le produit.

## Contexte

Ce cahier de recette couvre l'**unique fonctionnalité** de ce workspace : affichage du catalogue de transferts inter-îles au chargement de la page. Tous les tests sont dérivés du workflow unique documenté dans `WORKFLOW_AFFICHAGE_TRANSFERTS.md`.

**Confiance du cahier** : high — le code est exhaustif, le périmètre est clair.

**Périmètre non testé** (logique métier absente de ce dépôt) :
- Réservation (pas implémentée ici)
- Filtres, tris, recherche (pas implémentés)
- Authentification (pas implémentée)
- Persistance (pas implémentée)

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
| 5 | L'affichage est instantané (sans blocage) | < 100ms en local pour un catalogue de 10–50 transferts |

**Exemple de `<li>` attendue**
```
Tahiti → Moorea — 5000 XPF (12 places)
```

**Acceptation** : Les 5 assertions passent.

---

### TC-02 : Contenu et formatage des transferts

**Objectif** : Vérifier que chaque transfert affiche correctement les 4 champs.

**Contexte** : API renvoie des transferts avec `from`, `to`, `price`, `availableSeats`.

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
| 4 | `availableSeats` est affiché suivi de ` places` | Format : `[nombre] places` |
| 5 | Tous les transferts retournés par l'API sont affichés | Aucune omission, aucun doublon |

**Exemple de données API → rendu attendu**
```javascript
// API retourne
{ from: "Tahiti", to: "Moorea", price: 5000, availableSeats: 12 }

// Front affiche
<li>Tahiti → Moorea — 5000 XPF (12 places)</li>
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
| 2 | Un message explicite est affiché à l'utilisateur | **FAIL** — page silencieuse (comportement actuel) |
| 3 | La console JavaScript contient un indice d'erreur | **PASS** — erreur dans `fetch()` |

**Note** : Le test FAIL est une **dette technique** documentée. Le comportement actuel accepte le silence en pilote ; production nécessiterait un message.

**Acceptation** : Pas de crash (assertion 1 passe). Les autres sont des recommandations.

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
   { from: "Tahiti", to: "Moorea", price: 5000 }
   // availableSeats est absent
   ```
2. Charger la page
3. Observer le rendu du transfert

**Comportement actuel** :
- La `<li>` affiche : `Tahiti → Moorea — 5000 XPF (undefined places)`
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
- `response.ok` n'est pas vérifié
- `response.json()` peut réussir ou rejeter selon le corps
- Page reste silencieuse

**Assertions**

| # | Assertion | Réalité |
|---|-----------|---------|
| 1 | Pas de crash | **PASS** (probablement) |
| 2 | Message d'erreur visible | **FAIL** |

**Note** : Comportement attendu pour un pilote ; production exigerait une gestion.

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
| TC-06 (Staging) | — | — | ✓ | **À tester en staging** |
| TC-07 (HTTP 500) | — | ✓ | — | Pas de crash (PASS), message absent (attendu) |
| TC-08 (Format inattendu) | — | ✓ | — | Crash en console (bug documenté) |
| TC-09 (Perf large) | — | — | ✓ | Optionnel, à revisiter si besoin |

## Recommandations pour améliorer la testabilité

1. **Ajouter des messages d'erreur** : l'utilisateur ne peut pas distinguer « pas de transferts » d'« erreur API »
2. **Documenter le contrat API** : quels champs sont obligatoires ? Quels types exacts ?
3. **Ajouter des tests unitaires/intégrés** : aucun test n'existe actuellement (pas de répertoire `test/`, pas de script `npm test`)
4. **Valider les données** : `Array.isArray(transfers)`, vérifier les champs obligatoires

## Régressions à surveiller

Avant toute modification du code, tester :

1. **Aucune modification d'`index.html`** : vérifier que l'id `transfers-list` et le titre restent inchangés
2. **Aucune modification de l'URL API** : vérifier que l'appel cible toujours `${API_BASE_URL}/transfers`
3. **Aucune modification de la structure des `<li>`** : vérifier que le format reste `[from] → [to] — [price] XPF ([seats] places)`
4. **Aucune modification de la police d'injection de `window.API_BASE_URL`** : documenter tout changement

## Preuves et traçabilité

Tous les tests sont dérivés du workflow unique `WORKFLOW_AFFICHAGE_TRANSFERTS.md`, lui-même extrait des audits :
- FUNCTIONAL_AUDIT.md
- SECURITY_ROBUSTNESS_AUDIT.md
- CODE_HOTSPOTS_AUDIT.md
- DATA_MODEL_AUDIT.md
