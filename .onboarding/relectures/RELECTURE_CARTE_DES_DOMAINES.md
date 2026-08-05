# Relecture — CARTE_DES_DOMAINES.md

## Verdict global

**Bon** — La carte est exploitable sans réserve bloquante. Les deux domaines sont prouvés par des références de code précises et vérifiées indépendamment. La granularité réduite (2 domaines au lieu de 4–12) est explicitement justifiée et honnête compte tenu de la petite taille du périmètre (3 fichiers, ~40 lignes). Les niveaux de confiance sont correctement calibrés. La section Incertitudes couvre les zones d'ombre réelles sans spéculation.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**1. Domaine `consultation-transferts` — prouvé.** Ouvert `js/app.js` en entier (20 lignes). Preuves directes :
- `async function loadTransfers()` à `js/app.js:5`
- `document.getElementById("transfers-list")` à `js/app.js:9`
- accès aux champs `t.from`, `t.to`, `t.price`, `t.availableSeats` à `js/app.js:13`
- `document.addEventListener("DOMContentLoaded", loadTransfers)` à `js/app.js:19`

Ouvert `index.html` en entier (12 lignes) :
- `<ul id="transfers-list"></ul>` à `index.html:9`

Catégorisation `métier / cœur` : correcte — c'est la seule fonction métier de la page.

**2. Domaine `integration-api` — prouvé.** Preuves directes dans `js/app.js` :
- `// Front des transferts — consomme shift-pilot-resa-api.` à `js/app.js:1`
- `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` à `js/app.js:2-3`
- `fetch(\`${API_BASE_URL}/transfers\`)` à `js/app.js:6`
- `response.json()` à `js/app.js:7`

Ouvert `README.md` (7 lignes) : `Consomme \`shift-pilot-resa-api\` (même projet, dépôt séparé)` à `README.md:4`. Catégorisation `intégration / support` : correcte.

**3. Aucun code de réservation.** `grep -niE "reserv|booking|panier|cart|book|order|commande"` sur `js/app.js`, `index.html`, `README.md` → 0 résultat. La mise en incertitude du domaine « Réservation » est correcte — aucun domaine inventé.

**4. Indices de rattachement vérifiés.** Pattern `transfers-list` : `index.html:9` + `js/app.js:9` — spécifique, ne peut pas sur-capturer sur 3 fichiers. Patterns `loadTransfers`, `API_BASE_URL`, `window.API_BASE_URL`, `http://localhost:3100` : tous vérifiés aux lignes exactes citées dans la carte.

**5. Granularité — écart documenté et justifié.** La carte déclare explicitement l'écart au seuil 4–12 et l'argumente (3 fichiers, périmètre pilote). Inventer un troisième domaine serait une carte fausse. Règle « preuves pauvres → domaines en confiance basse, jamais une carte inventée » correctement appliquée.

**6. Cœur identifié correctement.** `consultation-transferts` comme `priority: cœur` : vérifié. `integration-api` comme `priority: support` : vérifié. Séparation technique / métier : effective.

**7. Aucun oubli.** Les 3 fichiers versionnés ont été lus en entier. Il n'existe ni auth, ni formulaire, ni filtre, ni routage, ni gestion d'état, ni composant UI, ni job — rien d'autre que ce que les deux domaines couvrent.

**8. Confiances honnêtes.** `consultation-transferts` : `medium` — plafonnée par la nature pilote (seul commit `init: pilote de test SHIFT/Paperclip`), justification explicite dans le préambule. `integration-api` : `high` — mécanisme d'intégration entièrement observable en 3 lignes sans ambiguïté. Confiance globale `medium` : cohérente.

**9. "Dépend de la base" honnête.** `non` pour les deux domaines : correct — front statique, aucun accès base, boucle sur tableau plat (aucun des trois signaux du §6 de la compétence `cartographier-domaines`).

**10. Incertitudes honnêtes et complètes.** Réservation absente du code (grep vérifié) : `HYPOTHÈSE`, sans domaine inventé. Forme réelle de la ressource `transfer` : `INCONNU` / `VÉRIFIÉ_CODE` correctement distincts. Robustesse notée pour l'audit, pas gonflée en domaine. Projet à deux dépôts : scope maintenu, `ECOSYSTEME.md` suggérée hors périmètre.

## Recommandations de correction

Aucune correction requise. La carte peut être publiée telle quelle.
