# Relecture — WORKFLOW_CONFIGURATION_ENDPOINT

## Verdict global

**Bon** — le workflow est correct dans sa logique et ses preuves. Toutes les étapes correspondent au code (`js/app.js:2-3`), les règles métier sont exactes, la confiance `high` est justifiée. Les deux défauts mineurs signalés au tour précédent ont été corrigés : comptage de `index.html` (12 lignes) et étiquette du risque de détournement d'endpoint.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun — les défauts du tour précédent ont été corrigés :
- **[M1]** `index.html — intégralement lu (12 lignes)` ✓ (vérifié : 12 lignes réelles).
- **[M2]** Risque renommé en `Détournement de l'endpoint API si \`window.API_BASE_URL\` est contrôlable par un tiers` ✓ — étiquette exacte et distincte du XSS ; corps de description inchangé et correct.

## Points vérifiés et corrects

- **Fichiers cités** : `js/app.js` (20 lignes ✓), `index.html` (12 lignes ✓) — ouverts, présents.
- **Points d'entrée** : `index.html:10` = `<script src="js/app.js"></script>` ✓ ; chargement synchrone (pas d'attribut `async`/`defer`) ✓.
- **Étapes 1 à 4** : `typeof window !== "undefined"` (`js/app.js:2`) ✓ ; opérateur `||` (`js/app.js:2-3`) ✓ ; fallback `"http://localhost:3100"` ✓ ; `const` évaluée une seule fois ✓.
- **Règles métier** : priorité `window.API_BASE_URL` ✓ ; fallback immuable ✓ ; évaluation unique ✓ ; absence de validation d'URL ✓.
- **Confiance `high`** : justifiée — 2 lignes de code intégralement lisibles, aucune dépendance cachée.
- **Risques** : `window.API_BASE_URL` non injectée en production ✓ ; valeur falsy silencieuse ✓ ; URL malformée transmise telle quelle ✓ ; détournement d'endpoint correctement libellé ✓ — tous concrets et sourcés.
- **Questions ouvertes** : pertinentes et honnêtes (mécanisme production inconnu, multi-environnements).
- **Section Preuves** : `index.html — intégralement lu (12 lignes)` ✓.

## Recommandations de correction

Aucune.
