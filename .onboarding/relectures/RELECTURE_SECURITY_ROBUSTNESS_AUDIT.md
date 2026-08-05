# Relecture — SECURITY_ROBUSTNESS_AUDIT.md

## Verdict global

**Bon** — L'audit est exploitable sans réserve bloquante. L'analyse XSS est rigoureuse et sourcée (`textContent` vs `innerHTML` vérifiés ligne à ligne), les absences de secrets sont correctement attestées, les statuts `VÉRIFIÉ_CODE` / `HYPOTHÈSE` sont appliqués avec précision — notamment pour le vecteur CORS (non évaluable depuis ce dépôt).

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**1. Absence de XSS — prouvée, pas affirmée.**
`item.textContent = \`...\`` à `js/app.js:13` : vérifié. Aucun usage de `innerHTML` pour les données dynamiques. La distinction `textContent` (sûr) / `innerHTML` (vecteur XSS si données non assainies) est explicitement posée. ✓

**2. `list.innerHTML = ""` — correctement analysé.**
`js/app.js:10` : vide un nœud dont le contenu est contrôlé par le code lui-même, pas par des données API. Pas de vecteur XSS. Vérifié. ✓

**3. Fetch sans `try/catch` — `VÉRIFIÉ_CODE` exact.**
`js/app.js:6-7` : `fetch(...)` puis `response.json()` sans vérification de `response.ok` ni bloc de capture. Vérifié. Impact robustesse correctement qualifié (élevé en production) sans surqualification en vulnérabilité de sécurité. ✓

**4. `getElementById` sans garde nullité — correctement classé.**
`js/app.js:9-10` : `const list = document.getElementById("transfers-list")` non gardé. Correspondance avec `index.html:9` vérifiée. Classé fragilité de maintenance, pas risque de sécurité. ✓

**5. Aucun secret en dur — attesté.**
Grep sur `key`, `token`, `secret`, `password`, `apikey`, `Authorization` → 0 résultat sur 20 lignes de JS + 12 lignes de HTML. Vérifiable exhaustivement sur ce périmètre. ✓

**6. Vecteur `window.API_BASE_URL` — qualification correcte.**
Observation `VÉRIFIÉ_CODE` (la propriété est lue depuis `window`, `js/app.js:2`) ; scénario d'attaque `HYPOTHÈSE` (page hôte compromise, non observable depuis ce dépôt). Frontière preuve/hypothèse respectée. ✓

**7. CORS — `HYPOTHÈSE` correctement appliqué.**
La politique CORS est côté `shift-pilot-resa-api`, non visible depuis ce dépôt. Statut `HYPOTHÈSE` justifié. ✓

**8. Aucun secret recopié.** ✓

## Recommandations de correction

Aucune correction requise.
