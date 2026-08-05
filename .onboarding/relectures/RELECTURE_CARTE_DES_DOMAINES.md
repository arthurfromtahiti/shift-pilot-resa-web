# Relecture — CARTE_DES_DOMAINES.md

## Verdict global

**Bon** — La carte est exploitable sans réserve bloquante. Les deux domaines sont prouvés par des références de code précises, la granularité réduite (2 domaines au lieu de 4–12) est explicitement justifiée et honnête, les niveaux de confiance sont correctement calibrés, et la section Incertitudes couvre les zones d'ombre réelles sans spéculation.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

Aucun.

## Points vérifiés et corrects

**1. Domaine `consultation-transferts` — prouvé.**
Ouvert `js/app.js` en entier (20 lignes). Preuves directes :
- `function loadTransfers()` à `js/app.js:5`
- accès aux champs `t.from`, `t.to`, `t.price`, `t.availableSeats` à `js/app.js:12`
- `document.getElementById("transfers-list")` à `js/app.js:9`
- `document.addEventListener("DOMContentLoaded", loadTransfers)` à `js/app.js:19`
Ouvert `index.html` en entier (12 lignes) :
- `<ul id="transfers-list"></ul>` à `index.html:9`
Catégorisation `métier / cœur` : correcte — c'est la seule fonction métier de la page.

**2. Domaine `integration-api` — prouvé.**
Preuves directes dans `js/app.js` :
- `const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"` à `js/app.js:2-3`
- `fetch(\`${API_BASE_URL}/transfers\`)` à `js/app.js:6`
- `response.json()` à `js/app.js:7`
- commentaire `// Front des transferts — consomme shift-pilot-resa-api.` à `js/app.js:1`
Ouvert `README.md` (8 lignes) : `Consomme \`shift-pilot-resa-api\` (même projet, dépôt séparé)` à `README.md:4`. Catégorisation `intégration / support` : correcte.

**3. Indices de rattachement testés.**
Chaque pattern est spécifique au repo et ne matcherait pas un repo arbitraire : `transfers-list`, `loadTransfers`, `API_BASE_URL`, `window.API_BASE_URL`, `http://localhost:3100` n'apparaissent qu'aux lignes citées — pas de sur-capture possible sur 3 fichiers.

**4. Granularité — écart documenté et justifié.**
La carte déclare explicitement l'écart au seuil 4–12 et l'argumente (`js/app.js` : 20 lignes ; `index.html` : 12 lignes ; `README.md` : 8 lignes). Inventer un troisième domaine serait une carte fausse. La règle "preuves pauvres → domaines en confiance basse, jamais une carte inventée" est correctement appliquée.

**5. Cœur identifié correctement.**
`consultation-transferts` comme cœur (`priority: cœur`) : vérifié. C'est la raison d'être de la page ; sans ce domaine, il n'y a rien. `integration-api` comme support (`priority: support`) : vérifié. C'est le couplage technique, pas la valeur métier.

**6. Aucun oubli.**
J'ai lu les 3 fichiers versionnés dans leur intégralité. Il n'existe ni auth, ni formulaire, ni filtre, ni routage, ni gestion d'état, ni composant UI, ni job — rien d'autre que ce que les deux domaines couvrent.

**7. Techniques séparés du métier.**
L'intégration (`integration-api`) est isolée du métier (`consultation-transferts`). Il n'y a pas d'auth, de notifications ou de jobs dans ce dépôt — aucun domaine manquant sur ces axes.

**8. Confiances honnêtes.**
- `consultation-transferts` : `medium` — plafonnée par la nature pilote (`git log` : un seul commit `init: pilote de test SHIFT/Paperclip`), pas par une lecture partielle. Justification explicite dans le préambule. Correct.
- `integration-api` : `high` — mécanisme d'intégration entièrement observable (3 lignes sans ambiguïté). Correct ; « high confiance » signifie ici que le domaine est certain, pas qu'il est riche.
- Confiance globale `medium` : cohérente avec le contexte pilote.

**9. Incertitudes honnêtes et complètes.**
- Réservation absente du code (`grep -niE "reserv|booking|panier|cart|book|order|commande"` → 0 résultat) : correctement signalée comme `HYPOTHÈSE`, sans domaine inventé.
- Forme réelle de la ressource `transfer` : `INCONNU` (aucun schéma d'API dans ce dépôt), correctement distinguée de `VÉRIFIÉ_CODE` pour les champs lus.
- Robustesse non traitée (`response.json()` puis `for...of` sans garde) : notée pour l'audit, pas gonflée en domaine. Correct.
- Projet à deux dépôts (`ECOSYSTEME.md` suggérée, hors périmètre de ce workspace) : scope correctement maintenu.
- Détection "dépend de la base" : `non` pour les deux domaines, correct (front statique, zéro accès base).

**10. Statuts utilisés correctement.**
`VÉRIFIÉ_CODE` (champs lus dans le source) et `INCONNU` (forme réelle de l'API) appliqués conformément au socle-onboarding §1 / socle-agence.

## Recommandations de correction

Aucune correction requise. La carte peut être publiée telle quelle.
