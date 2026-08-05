# Relecture — WORKFLOW_AFFICHAGE_TRANSFERTS.md

## Verdict global

**Acceptable avec réserves** — Le flux est correct, les risques sont réels et sourcés, la confiance `high` est justifiée sur un périmètre aussi petit. Trois inexactitudes de citation (deux gardes Node.js omises, un numéro de ligne erroné) doivent être corrigées avant publication pour respecter le standard « sourcé ».

---

## Problèmes bloquants

Aucun.

---

## Problèmes mineurs

### 1. Garde `typeof window !== "undefined"` omise dans la citation `API_BASE_URL`

- **Où** : section Données + section Points d'entrée (étape 1)
- **Ce que dit l'analyse** : `` `window.API_BASE_URL || "http://localhost:3100"` `` (lignes 2–3)
- **Ce que dit le code réel** (`js/app.js`, ligne 3) :
  ```js
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"
  ```
- **Impact** : la citation tronquée masque que le code teste d'abord l'existence de `window` (compatibilité Node.js / environnement non-navigateur). C'est un signal d'architecture qui mérite au moins d'être mentionné dans les Questions ouvertes.

### 2. Garde `if (typeof document !== "undefined")` (ligne 18) absente de l'analyse

- **Où** : partout — Points d'entrée, Étapes, Preuves
- **Ce que dit l'analyse** : `document.addEventListener("DOMContentLoaded", loadTransfers)` (ligne 19)
- **Ce que dit le code réel** :
  ```js
  // ligne 18
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", loadTransfers);   // ligne 19
  }
  ```
- **Impact** : le `addEventListener` n'est jamais nu ; il est conditionnel à l'existence de `document`. Cette garde est invisible dans l'analyse. Avec la garde sur `window` (problème 1), elles forment un pattern cohérent de compatibilité Node.js / test unitaire — non évoqué dans les Questions ouvertes alors qu'il soulève une vraie question : ce code est-il testé hors navigateur ?

### 3. Numéro de ligne erroné pour `item.textContent` (ligne 12 annoncée, ligne 13 réelle)

- **Où** : section Étapes §6, section Règles métier §4 ("Quatre champs requis"), section Preuves
- **Ligne annoncée** : 12
- **Ligne réelle** (`js/app.js`) :
  - ligne 12 : `const item = document.createElement("li");`
  - ligne 13 : `item.textContent = \`${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)\`;`
- **Impact** : un lecteur qui suit la référence tombe sur `document.createElement`, pas sur l'affectation de `textContent`. Répété en trois endroits.

### 4. Nombre de lignes du README inexact (5 annoncées, 8 réelles)

- **Où** : section Preuves (`README.md — ouvert en entier (5 lignes)`)
- **Réalité** : 8 lignes (3 lignes de contenu + 2 lignes vides + titre `##Stack` + ligne de stack + ligne vide finale)
- **Impact** : négligeable sur la compréhension, mais la précision est la norme de ce type de livrable.

---

## Points vérifiés et corrects

- **Fichiers cités** : `js/app.js` (20 lignes), `index.html` (12 lignes), `README.md` — tous existent et ont été ouverts. Vérifiés ligne à ligne.
- **Classification `user_journey`** : justifiée — un utilisateur ouvre une page et voit une liste. Pas un traitement batch, pas un simple hook. ✓
- **Criticité haute** : correcte — c'est la seule fonctionnalité du workspace. ✓
- **Point d'entrée `<script src="js/app.js">` (index.html, ligne 10)** : vérifié. ✓
- **`DOMContentLoaded` → `loadTransfers` (app.js, ligne 19)** : vérifié (la ligne 19 est correcte ; la garde à la ligne 18 est le seul oubli). ✓
- **Fetch sans `response.ok` (app.js, ligne 6–7)** : vérifié. ✓
- **Désérialisation JSON sans vérification préalable (ligne 7)** : vérifié. ✓
- **`list.innerHTML = ""` (ligne 10)** : vérifié. ✓
- **Boucle `for...of` lignes 11–15** : numéros corrects. ✓
- **Quatre champs `from`/`to`/`price`/`availableSeats` lus sans validation (ligne 13)** : vérifié. ✓
- **Risques (API injoignable, réponse non-tableau, champs undefined, `getElementById` non gardé)** : tous réels, tous sourçables dans le code. ✓
- **Confiance `high` justifiée** : 3 fichiers, ~40 lignes, intégralement lus. ✓
- **Statuts `VÉRIFIÉ_CODE` / `INCONNU` correctement appliqués** : usage des champs = VÉRIFIÉ_CODE ✓ ; forme réelle de la réponse API = INCONNU ✓.
- **Un seul fichier workflow pour l'unique flux de l'app** : choix défendable sur un périmètre de 20 lignes. ✓
- **Nommage `WORKFLOW_AFFICHAGE_TRANSFERTS.md`** : conforme au motif `WORKFLOW_<CLÉ>.md` en majuscules, déposé dans `workflows/`. ✓

---

## Recommandations de correction

1. **Corriger la citation `API_BASE_URL`** (Données + Étapes §1) : remplacer `` `window.API_BASE_URL || "http://localhost:3100"` `` par `` `(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` `` et ajuster la description (lignes 2–3 → ligne 2 pour la constante, ligne 3 pour la valeur). 

2. **Ajouter la garde ligne 18** dans les Points d'entrée et/ou les Preuves : mentionner que le `addEventListener` est conditionnel à `if (typeof document !== "undefined")` (ligne 18). Ajouter une question ouverte : *« Le code comporte deux gardes Node.js (`typeof window`, `typeof document`) — ce code est-il utilisé ou testé hors navigateur ? »*

3. **Corriger le numéro de ligne `item.textContent`** : remplacer `ligne 12` par `ligne 13` dans les sections Étapes §6, Règles métier §4, et Preuves.

4. **Corriger le nombre de lignes du README** : remplacer `(5 lignes)` par `(8 lignes)` dans Preuves.
