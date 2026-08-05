# Relecture — Documents de référence (CLA-287)

Artefacts relus : `PROJECT_CONTEXT.md`, `CDC_FONCTIONNEL.md`, `CARTOGRAPHIE_CODE.md`, `CAHIER_RECETTE.md`  
Matériau amont contrôlé : `CARTE_DES_DOMAINES.md`, `WORKFLOW_AFFICHER_TRANSFERTS.md`, `WORKFLOW_CONFIGURATION_ENDPOINT.md`, `FUNCTIONAL_AUDIT.md`, `SECURITY_ROBUSTNESS_AUDIT.md`, `DATA_MODEL_AUDIT.md`  
Code source vérifié : `js/app.js` (20 lignes), `index.html` (12 lignes)

---

## Verdict global (passe 2 — 2026-08-05)

**Approuvé** — Toutes les corrections demandées lors de la passe 1 ont été appliquées correctement dans `CARTOGRAPHIE_CODE.md` :
- Bloc `loadTransfers()` réordonné : `fetch` → `response.json()` → accès DOM → manipulation — conforme à `js/app.js:5-16`.
- Liste "Responsabilités concentrées ici" réordonnée en cohérence.
- Citations HTML corrigées : `<!doctype html>`, `<html lang="fr">`, `<meta charset="utf-8" />`, `<title>Transferts inter-îles</title>` — conformes à `index.html:1-5`.

Les quatre documents sont désormais entièrement traçables à l'amont, sans invention, avec matière bien exploitée.

---

## Verdict global (passe 1 — historique)

**À corriger** — Un défaut bloquant dans `CARTOGRAPHIE_CODE.md` : le bloc de code reproduisant `loadTransfers()` présentait les instructions dans un ordre différent du code réel (`js/app.js:5-16`). Les trois autres documents (`PROJECT_CONTEXT.md`, `CDC_FONCTIONNEL.md`, `CAHIER_RECETTE.md`) étaient solides, sourcés et exploitaient bien le matériau amont.

---

## Problèmes bloquants

### [1] `CARTOGRAPHIE_CODE.md` — Mauvais ordre d'exécution dans le bloc de code de `loadTransfers()`

**Localisation** : `CARTOGRAPHIE_CODE.md`, section `#### Lignes 5–16 : Fonction \`loadTransfers()\``

**Ce que le document dit** :
```javascript
async function loadTransfers() {
  const list = document.getElementById("transfers-list");  // <-- 1er
  const response = await fetch(`${API_BASE_URL}/transfers`);
  const transfers = await response.json();
  list.innerHTML = "";
  ...
```

**Ce que le code dit réellement** (`js/app.js:5-16`, vérifié) :
```javascript
async function loadTransfers() {
  const response = await fetch(`${API_BASE_URL}/transfers`);  // <-- 1er
  const transfers = await response.json();

  const list = document.getElementById("transfers-list");
  list.innerHTML = "";
  ...
```

**Impact** : l'accès DOM (`document.getElementById`) est présenté comme précédant le `fetch`, alors qu'il se produit après la désérialisation de la réponse (`await response.json()`). Toute personne lisant ce document pour comprendre le flux d'exécution reçoit une séquence inversée. La liste "Responsabilités concentrées ici" (1. Accès DOM, 2. Appel réseau, 3. Désérialisation…) reproduit ensuite ce mauvais ordre.

**Preuve amont pour la correction** : `WORKFLOW_AFFICHER_TRANSFERTS.md` §Étapes principales liste les étapes 4 (fetch), 5 (désérialisation), 6 (vidage DOM), 7 (rendu) dans le bon ordre — le workflow amont est correct, mais le document reproduit le code dans un ordre différent.

---

## Problèmes mineurs

### [2] `CARTOGRAPHIE_CODE.md` — Citations HTML inexactes (3 points)

**Localisation** : bloc de code sous `### \`index.html\` (12 lignes)`

| Élément | Dans le document | Dans le fichier réel (`index.html`) |
|---|---|---|
| Doctype | `<!DOCTYPE html>` | `<!doctype html>` |
| Balise html | `<html>` | `<html lang="fr">` |
| Balise title | `<title>Transferts Inter-îles</title>` | `<title>Transferts inter-îles</title>` |
| Meta charset | absente du bloc | `<meta charset="utf-8" />` présente |

Ces écarts ne changent pas la compréhension fonctionnelle mais le bloc de code présenté comme reproduction fidèle ne l'est pas. L'attribut `lang="fr"` est notamment structurellement significatif (accessibilité, SEO).

**Preuve** : lecture directe de `index.html:1-6`.

---

## Points vérifiés et corrects

**`PROJECT_CONTEXT.md`** — Entièrement traçable à l'amont. Niveau de confiance `medium` justifié et argumenté. Les deux domaines (`consultation-transferts`, `integration-api`) correspondent exactement à la `CARTE_DES_DOMAINES.md`. Les preuves en `js/app.js:X` sont toutes vérifiées. Les incertitudes (réservation absente, déploiement inconnu, forme de l'API inconnue) sont marquées et sourcées. Aucune invention.

**`CDC_FONCTIONNEL.md`** — Très bon document. Toutes les règles métier sont traçables : le format `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` est cité avec `js/app.js:13`. Les 4 scénarios de défaillance reproduisent fidèlement les risques de `WORKFLOW_AFFICHER_TRANSFERTS.md` §Risques et `SECURITY_ROBUSTNESS_AUDIT.md`. Les `INCONNU` (forme réelle de l'API) sont honnêtement marqués. La séquence des étapes (endpoint → fetch → json → DOM → rendu) est correcte et cohérente avec le code réel. L'absence de réservation est bien sourcée (`FUNCTIONAL_AUDIT.md`). Les questions ouvertes correspondent à celles des workflows.

**`CAHIER_RECETTE.md`** — Complet et sourcé. Les 7 parcours couvrent l'ensemble des risques identifiés dans les audits et workflows amont. Chaque amélioration recommandée dans les scénarios de défaillance cite l'action correctrice source (`SECURITY_ROBUSTNESS_AUDIT.md`, `DATA_MODEL_AUDIT.md`). Le scénario 6.1 (XSS) est tracé au constat `VÉRIFIÉ_CODE — Protection XSS présente` de l'audit. Le plan de régression (4 scénarios minimums) est raisonnable pour un pilote. Scénario 3.3 : la logique `"" || fallback` et `null || fallback` est vérifiée contre `js/app.js:2-3`.

**Tracabilité globale** — Aucune fonctionnalité inventée. Les limites assumées (pas de filtre, pas de réservation, pas de tests, déploiement inconnu) sont toutes vérifiées dans le code. Les marqueurs HYPOTHÈSE/INCONNU sont utilisés à bon escient. La matière amont (6 audits + 2 workflows + carte des domaines) est bien exploitée — les documents ne sont pas creux.

---

## Recommandations de correction

**1. Correction bloquante — `CARTOGRAPHIE_CODE.md`, section `#### Lignes 5–16`** :
   - Remettre le bloc de code dans l'ordre réel : `fetch` en premier, puis `response.json()`, puis `const list = document.getElementById(...)`, puis `list.innerHTML = ""`, puis la boucle.
   - Corriger dans la foulée la liste "Responsabilités concentrées ici" en échangeant l'ordre des points 1 (Accès DOM) et 2 (Appel réseau) pour refléter l'ordre réel d'exécution.

**2. Corrections mineures — `CARTOGRAPHIE_CODE.md`, section `### \`index.html\``** :
   - Corriger `<!DOCTYPE html>` → `<!doctype html>`
   - Corriger `<html>` → `<html lang="fr">`
   - Corriger `<title>Transferts Inter-îles</title>` → `<title>Transferts inter-îles</title>`
   - Ajouter `<meta charset="utf-8" />` dans le `<head>` du bloc reproduit
