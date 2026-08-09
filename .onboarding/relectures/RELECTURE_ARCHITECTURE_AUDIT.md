# Relecture — ARCHITECTURE_AUDIT.md

> Mise à jour SHIA-572. La version précédente de cette relecture portait sur l'ancien `js/app.js` (20 lignes, sans package.json ni tests). Elle est intégralement remplacée par la relecture de l'audit réconcilié.

## Verdict global

**À corriger** — La correction du scénario de crash est appliquée, mais le risque de configuration contient encore une conséquence factuelle incorrecte : le fallback `localhost:3100` est bien prouvé, tandis que le `catch` affiche une erreur si l'appel échoue ; le catalogue n'est donc pas simplement « vide » sans message. La formulation doit distinguer le comportement code observé du scénario de déploiement hypothétique.

## Problèmes bloquants

- **Risque `window.API_BASE_URL` mal décrit (`ARCHITECTURE_AUDIT.md:47`).** `js/app.js:2-3` prouve le fallback vers `http://localhost:3100`, et `js/app.js:12-16,39-40` prouve qu'un échec réseau est attrapé puis affiché dans `list.textContent`. L'audit affirme pourtant « aucune erreur visible » et « catalogue vide » ; cela contredit le code. Requalifier en deux éléments : `VÉRIFIÉ_CODE` pour le fallback et le message d'erreur en cas d'échec, `HYPOTHÈSE` pour l'absence d'injection en production et son occurrence.

## Corrections appliquées (SHIA-572, passage 2)

- **Dettes techniques — état module-level partagé** : la mention « un `finally` qui ne s'exécute pas » est clarifiée comme `HYPOTHÈSE`. Le `finally` s'exécute toujours en JS normal (`js/app.js:62–64, 83–84`) ; le scénario d'interruption runtime entre `pendingTransfers.add` et `finally` est hypothétique.

## Points vérifiés et corrects

**1. Architecture plate — `VÉRIFIÉ_CODE` exact.**
`index.html` (12 lignes) + `js/app.js` (90 lignes) + `js/app.test.js` (311 lignes) + `package.json` minimal. Aucun bundler, aucun framework, aucune dépendance de production. ✓

**2. Configuration par injection globale — `VÉRIFIÉ_CODE` + `HYPOTHÈSE` correctement appliqués.**
`window.API_BASE_URL` aux lignes 2–3 : observation code = `VÉRIFIÉ_CODE`. Mécanisme d'injection en production = `HYPOTHÈSE` (non versionné). ✓

**3. Garde `typeof document` — justifiée par les tests.**
Ligne 88 : permet l'import depuis `js/app.test.js` sans déclencher `DOMContentLoaded`. Usage réel confirmé. ✓

**4. `package.json` minimal — `VÉRIFIÉ_CODE` exact.**
`{ "type": "module", "scripts": { "test": "node --test" } }`. Aucune dépendance de production. ✓

**5. Absence de routing — `VÉRIFIÉ_CODE` exact.**
Une seule page, un seul template. Tout ajout de flux multi-page nécessite un mécanisme inexistant aujourd'hui. ✓

**6. Risques correctement qualifiés.**
- `window.API_BASE_URL` non injectée → `HYPOTHÈSE`. ✓
- Aucune voie d'évolution structurée → `VÉRIFIÉ_CODE` (constat structurel direct). ✓

**7. Aucun secret recopié.** ✓

## Recommandations de correction

1. Corriger `.onboarding/audits/ARCHITECTURE_AUDIT.md:47` sans présenter comme fait l'absence d'erreur visible ; conserver les citations `js/app.js:2-3,12-16,39-40`.
