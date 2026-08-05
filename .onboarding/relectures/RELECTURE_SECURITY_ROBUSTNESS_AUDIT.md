# Relecture — SECURITY_ROBUSTNESS_AUDIT.md

## Verdict global

**Acceptable avec réserves** — L'analyse de sécurité est globalement correcte et les constats majeurs sont bien sourcés. Deux imprécisions mineures doivent être corrigées : une affirmation factuelle inexacte sur l'absence d'`innerHTML` et un bloc étiqueté `VÉRIFIÉ_CODE` qui contient en réalité une hypothèse.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

### Mineur 1 — Affirmation inexacte : "pas de innerHTML dynamique"

**Section Forces** : `"Pas de eval, pas de Function(), pas de innerHTML dynamique : aucun vecteur d'injection de code via les primitives JS dangereuses — vérifié sur l'intégralité de js/app.js."`

**Ce qui est observé dans le code** : `list.innerHTML = ""` à `js/app.js:10` — `innerHTML` est bel et bien utilisé. La valeur assignée est une chaîne vide (littéral, non contrôlée par l'API), donc aucun vecteur XSS. Mais la formulation "pas de innerHTML dynamique" est factuellemet inexacte : `innerHTML` est utilisé, il l'est simplement de façon sûre.

**Correction** : remplacer la formulation par quelque chose de précis, par exemple : `"pas d'eval, pas de Function() ; innerHTML utilisé uniquement pour vider la liste (js/app.js:10) avec une chaîne vide — aucun contenu externe jamais injecté via innerHTML."`

**Impact** : un lecteur qui inspecte le code trouvera `innerHTML` et doutera de l'audit. Le point de sécurité est correct ; seule la formulation doit être corrigée.

---

### Mineur 2 — Label `VÉRIFIÉ_CODE` sur un bloc qui contient une hypothèse

**Section** : `"VÉRIFIÉ_CODE — Risque de détournement de window.API_BASE_URL. Si js/app.js est chargé dans une page hôte qui définit window.API_BASE_URL via un mécanisme contrôlable par un tiers [...]. Ce risque dépend du contexte d'hébergement, opaque dans ce dépôt (HYPOTHÈSE)."`

**Le problème** : l'étiquette `VÉRIFIÉ_CODE` est posée sur l'ensemble du bloc, mais le bloc lui-même reconnaît que le scénario de risque est une `HYPOTHÈSE`. Le fait que `window.API_BASE_URL` soit lue depuis l'objet `window` (js/app.js:2-3) est bien `VÉRIFIÉ_CODE`. La possibilité qu'un script tiers l'écrase est une `HYPOTHÈSE` qui dépend du contexte de déploiement.

**Correction** : soit scinder en deux blocs (`VÉRIFIÉ_CODE` pour le mécanisme observé + `HYPOTHÈSE` pour le scénario de risque), soit retagger l'ensemble en `HYPOTHÈSE` avec une référence au code source (`js/app.js:2-3`).

---

## Points vérifiés et corrects

- **Protection XSS par `textContent`** : `item.textContent = ...` à `js/app.js:13` — confirmé. Aucun `innerHTML` avec contenu externe.
- **Aucun en-tête d'authentification** : `fetch(\`${API_BASE_URL}/transfers\`)` à `js/app.js:6` — aucun `Authorization`, `Cookie` ni `X-API-Key` — correct.
- **Absence de try/catch** : `loadTransfers` (lignes 5-16) — confirmé.
- **`response.ok` non contrôlé** : `js/app.js:6-7` — aucune vérification du statut HTTP — correct.
- **Fallback HTTP** : `"http://localhost:3100"` à `js/app.js:3` — HTTP non-TLS — correct.
- **Absence de CSP dans `index.html`** : aucune balise `<meta http-equiv="Content-Security-Policy">` dans les 12 lignes du fichier — confirmé.
- **Aucun secret dans le dépôt** : aucune valeur sensible dans `README.md`, `index.html`, `js/app.js` — confirmé.
- **Aucun `eval`, aucun `Function()` dynamique** : confirmé par lecture de l'intégralité de `js/app.js`.
- **Confiance `high` sur les constats locaux** : tous les faits prouvables dans ce workspace sont prouvés — calibrage correct.

## Recommandations de correction

1. **Mineur 1** : dans la section Forces, remplacer `"pas de innerHTML dynamique"` par une formulation qui reconnaît l'usage de `innerHTML = ""` (js/app.js:10) tout en précisant qu'aucun contenu externe n'est injecté via cette primitive.

2. **Mineur 2** : dans le constat sur `window.API_BASE_URL`, séparer l'observation de code (`VÉRIFIÉ_CODE` : le mécanisme de lecture depuis `window`) du scénario de risque (`HYPOTHÈSE` : la surcharge par un script tiers), ou retagger l'ensemble en `HYPOTHÈSE` avec référence à `js/app.js:2-3`.

---

## Itération 2 — Vérification des corrections (2026-08-05)

**Verdict : Bon — corrections vérifiées, audit approuvé.**

### Mineur 1 ✅ Corrigé

Section Forces, ligne correspondante désormais :
> "Pas de `eval`, pas de `Function()`, `innerHTML` limité à la réinitialisation : `list.innerHTML = ""` (`js/app.js:10`) est la seule occurrence — usage sûr (chaîne vide constante, aucun contenu externe). Le rendu de données API passe exclusivement par `textContent` (`js/app.js:13`), éliminant tout vecteur XSS à partir des données reçues."

L'usage de `innerHTML` est maintenant reconnu, qualifié (chaîne vide, non externe) et sourcé. Le constat de sécurité est préservé. Correction exactement conforme à la demande.

### Mineur 2 ✅ Corrigé

Le bloc `window.API_BASE_URL` est maintenant séparé en deux entrées distinctes :
- `VÉRIFIÉ_CODE — Exposition de window.API_BASE_URL sans validation.` — observation du mécanisme de lecture (`js/app.js:2-3`), sans mention de scénario de risque.
- `HYPOTHÈSE — Risque de détournement par un script tiers.` — scénario conditionnel explicitement étiqueté `HYPOTHÈSE`, sans réf. de code directe mais avec le contexte d'hébergement.

La séparation respecte la grille des statuts de preuve. Correction conforme.
