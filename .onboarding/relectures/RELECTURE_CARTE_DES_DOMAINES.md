# Relecture — Carte des domaines (shift-pilot-resa-web)

## Verdict global

**Bon** — La carte est exacte, honnête et correctement sourcée. Chaque affirmation a été vérifiée ligne par ligne dans `js/app.js` et `index.html`. L'écart au gabarit (2 domaines au lieu de 4-12) est justifié et documenté : le dépôt contient 20 lignes de code versionnées, et la règle *« preuves pauvres → moins de domaines, jamais une carte inventée »* prime sur le seuil numérique.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**Contrôle 1 — Domaine `consultation-transferts` prouvé.**
- `js/app.js:5` : déclaration de `loadTransfers()` → `VÉRIFIÉ_CODE`.
- `js/app.js:11-15` : boucle `for (const t of transfers)`, lecture de `t.from`, `t.to`, `t.price`, `t.availableSeats` → `VÉRIFIÉ_CODE`.
- `js/app.js:19` : déclenchement sur `DOMContentLoaded` → `VÉRIFIÉ_CODE`.
- `index.html:9` : `<ul id="transfers-list">` → `VÉRIFIÉ_CODE`.
- `index.html:10` : `<script src="js/app.js">` → `VÉRIFIÉ_CODE`.
- Tous les indices de rattachement cités matchent ces lignes et n'envahissent pas le reste du dépôt (3 fichiers sources en tout).

**Contrôle 2 — Domaine `integration-api` prouvé.**
- `js/app.js:2-3` : `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` → `VÉRIFIÉ_CODE`.
- `js/app.js:6` : `fetch(\`${API_BASE_URL}/transfers\`)` → `VÉRIFIÉ_CODE`.
- `js/app.js:7` : `response.json()` → `VÉRIFIÉ_CODE`.
- `js/app.js:1` et `README.md:4` : mention explicite de `shift-pilot-resa-api` → `VÉRIFIÉ_CODE`.
- Séparation technique/métier correcte : le point de couplage inter-dépôts est réel et mérite d'être isolé.

**Contrôle 3 — Absence de code de réservation confirmée.**
- `grep -niE "reserv|booking|panier|cart|book|order|commande"` sur `js/` + `index.html` → 0 résultat.
- Le README parle d'*« interface de réservation »* (`README.md:3`) mais aucun code ne le confirme dans ce workspace. Traitement en Incertitude correct — aucun domaine Réservation inventé.

**Contrôle 4 — Granularité.**
- 2 domaines pour 3 fichiers / ~20 lignes : ratio cohérent. La fusion des deux domaines en un seul aurait fondu le point de couplage technique (la config `API_BASE_URL`) dans le domaine métier, masquant l'architecture à deux dépôts.
- L'écart au gabarit (4-12) est explicitement assumé et correctement justifié par la règle de la compétence.

**Contrôle 5 — Oublis.**
- Exploration directe du dépôt (listing complet) : 3 fichiers sources (`README.md`, `index.html`, `js/app.js`), aucun contrôleur, aucun job, aucun modèle, aucun schéma. Rien n'a été omis.

**Contrôle 6 — Confiances honnêtes.**
- `consultation-transferts` à `medium` : justifié — la forme réelle de la ressource `transfer` n'est pas observable dans ce dépôt (API externe, aucun schéma local). Correct.
- `integration-api` à `high` : justifié — les 3 lignes constituant ce domaine sont intégralement lues et vérifiées ; il n'y a pas d'inconnu dans ce périmètre. Correct.

**Contrôle 7 — Champ « Dépend de la base ».**
- Les deux domaines affichent `non`. Front statique sans accès base, aucun schéma, aucun ORM — verdict vérifiable et exact.

**Contrôle 8 — Incertitudes.**
- Les quatre incertitudes listées (Réservation absent, forme de `transfer` inconnue, robustesse absente, projet bi-dépôt) sont légitimes, correctement qualifiées `HYPOTHÈSE` ou `INCONNU`, et ne sont pas érigées en domaines sans preuve.

## Recommandations de correction

Aucune correction requise. La carte peut être publiée telle quelle.
