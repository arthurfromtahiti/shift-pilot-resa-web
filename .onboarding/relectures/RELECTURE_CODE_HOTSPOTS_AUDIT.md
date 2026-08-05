# Relecture — CODE_HOTSPOTS_AUDIT.md

## Verdict global

**Bon** — L'audit est exploitable sans réserve bloquante. Les deux hotspots principaux (lignes 6–7 pour le réseau, ligne 13 pour le couplage schéma) sont correctement identifiés, sourcés, et hiérarchisés. Tous les numéros de ligne sont exacts. La garde `typeof document` (ligne 18) est mentionnée ici avec sa ligne correcte, ce qui distingue favorablement cet audit d'autres zones.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**1. Hotspot lignes 6–7 — `VÉRIFIÉ_CODE` exact.**
`fetch(\`${API_BASE_URL}/transfers\`)` à `js/app.js:6`, `response.json()` à `js/app.js:7` : aucun `try/catch`, aucun `response.ok`. Vérifié. Classé hotspot numéro 1. ✓

**2. Hotspot ligne 13 — `VÉRIFIÉ_CODE` exact.**
`item.textContent = \`${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)\`` à `js/app.js:13` : couplage implicite aux quatre champs de la ressource `transfer`. Vérifié. Risque `undefined` silencieux en cas de renommage côté API : concret. ✓

**3. `getElementById` non gardé — ligne 9 exacte.**
`const list = document.getElementById("transfers-list")` à `js/app.js:9`, `list.innerHTML = ""` à `js/app.js:10`. Correspondance avec `index.html:9` vérifiée. Classification fragilité à la maintenance (pas hotspot de sécurité) : correcte. ✓

**4. Config `window.API_BASE_URL` — lignes 2–3 exactes.**
`(typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` aux lignes 2–3. Risque de valeur invalide si la page hôte initialise mal la variable : `VÉRIFIÉ_CODE` pour l'observation, scénario qualifié comme « improbable mais non impossible ». ✓

**5. Garde `typeof document` — ligne 18 correctement citée.**
`if (typeof document !== "undefined")` à `js/app.js:18`, `document.addEventListener(...)` à `js/app.js:19`. L'audit identifie les deux lignes et soulève la question de l'usage réel pour des tests hors navigateur. ✓

**6. Aucun secret recopié.** ✓

## Recommandations de correction

Aucune correction requise.
