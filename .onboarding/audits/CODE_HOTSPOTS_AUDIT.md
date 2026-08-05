# Code Hotspots — Audit

> Confiance : high

## Compréhension globale

Le dépôt ne contient qu'un seul fichier de code utile : `js/app.js` (20 lignes). Par définition, tout point chaud du code vit dans ce fichier. Il n'y a pas de fichier volumineux, pas de couplage multi-fichier, pas de code généré. L'analyse des hotspots se réduit à identifier, dans ces 20 lignes, les fragments qui concentrent le risque de régression ou de maintenance difficile.

## Résumé exécutif

`js/app.js` est le seul fichier de logique exécutable du dépôt. Avec 20 lignes, il n'existe aucun hotspot par volume ou par complexité cyclomatique au sens classique. Les points chauds sont fonctionnels et relationnels : (1) les lignes 6–7, où se concentre toute la fragilité réseau (appel sans garde, désérialisation sans vérification) ; (2) la ligne 13, où se noue le couplage implicite avec le schéma de l'API distante. Ces deux fragments sont le premier endroit à regarder lors de tout incident ou évolution. La garde `typeof document` (ligne 18) est un vestige de prudence hors-navigateur dont l'utilité réelle est incertaine, mais elle ne crée pas de risque.

## Constats détaillés

**`VÉRIFIÉ_CODE` — `js/app.js`, lignes 6–7 : point de fragilité réseau.** `const response = await fetch(\`${API_BASE_URL}/transfers\`)` (ligne 6) puis `const transfers = await response.json()` (ligne 7) : ces deux lignes sont le seul point de contact avec l'extérieur et elles sont entièrement non gardées. Pas de `try/catch`, pas de vérification de `response.ok`, pas de validation du type retourné. Toute erreur réseau ou HTTP produit une exception qui remonte non capturée. C'est le fragment de code le plus risqué du dépôt en termes de robustesse, et le plus probable à être à l'origine d'un bug observable en production.

**`VÉRIFIÉ_CODE` — `js/app.js`, ligne 13 : couplage implicite avec le schéma API.** `item.textContent = \`${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)\`` : les quatre champs de la ressource `transfer` sont accédés directement sans garde. Ce fragment crée un couplage point-à-point avec le schéma de `shift-pilot-resa-api`. Si un champ est renommé ou supprimé côté API, ce fragment produit silencieusement un `undefined` dans le rendu — aucune erreur levée, aucun test cassé (il n'y a pas de tests).

**`VÉRIFIÉ_CODE` — `js/app.js`, ligne 9 : `getElementById` non gardé.** `const list = document.getElementById("transfers-list")` renvoie `null` si l'élément est absent. `list.innerHTML = ""` (ligne 10) lèverait alors une `TypeError`. Ce couplage avec la structure HTML est stable dans l'état actuel (`index.html`, ligne 9 — l'identifiant correspond), mais c'est un vecteur de regression fragile si le HTML évolue indépendamment.

**`VÉRIFIÉ_CODE` — `js/app.js`, lignes 2–3 : configuration par propriété globale.** La résolution de `window.API_BASE_URL` est non gardée contre une valeur invalide (chaîne vide, valeur non-chaîne). Si `window.API_BASE_URL` est `null` ou `""`, le `fetch` cible une URL potentiellement malformée. Ce cas est improbable mais non impossible si la page hôte initialise mal la variable.

**`VÉRIFIÉ_CODE` — `js/app.js`, lignes 18–19 : garde `typeof document`.** La garde est présente mais son contexte d'usage (tests Node.js ?) n'est pas documenté et aucun test n'existe dans ce dépôt. Si elle n'est utilisée pour aucun test, elle est du code défensif mort — pas un risque, mais un signal d'intention non suivie.

## Forces

- **20 lignes au total** : aucun fichier volumineux, aucune logique enfouie, aucune dépendance entre modules. N'importe quel développeur peut lire et comprendre le code en entier en moins de deux minutes.
- **Pas de code généré, pas de duplication** : tout est écrit une fois, rien n'est copié-collé.
- **La garde `typeof window`** (ligne 2) et la garde `typeof document` (ligne 18) montrent une conscience des environnements multiples, même si aucun test n'en tire parti actuellement.

## Dettes techniques

- **Les lignes 6–7 (`fetch` + `response.json()`) sont non gardées** : premier endroit à corriger avant toute mise en production. Toute erreur réseau, 4xx ou 5xx produit une exception non capturée.
- **La ligne 13 exprime un contrat API implicite** : les quatre champs sont directement accédés sans validation. En l'absence de tests, toute évolution de l'API peut casser silencieusement l'affichage.

## Zones critiques

- **`js/app.js`, lignes 6–7** : appel réseau sans gestion d'erreur — c'est le hotspot numéro 1, le seul point où une défaillance externe (API down, timeout, format inattendu) peut rendre la page silencieusement inutilisable.
- **`js/app.js`, ligne 13** : couplage implicite avec le schéma de l'API — hotspot numéro 2, seul endroit où un changement de l'API distante provoquerait un bug front sans erreur explicite.

## Risques

- **`VÉRIFIÉ_CODE` — Page muette en cas d'erreur.** Sans `try/catch` (lignes 6–7), toute exception non capturée dans `loadTransfers` laisse la page avec une liste vide et aucun message — l'utilisateur ne peut pas distinguer « aucun transfert » de « erreur de chargement ».
- **`VÉRIFIÉ_CODE` — Champs `undefined` silencieux.** Si l'API renvoie un objet `transfer` avec un champ renommé ou absent, la ligne 13 produit `undefined` dans l'interface — sans erreur JS, sans test rouge.

## Recommandations priorisées

1. **Encadrer les lignes 6–7 d'un `try/catch`, ajouter `if (!response.ok) throw new Error(...)` après `fetch`.** C'est la correction la plus impactante sur la robustesse. Fichier : `js/app.js`, lignes 6–7.
2. **Valider la forme de `transfers` avant d'itérer** (`Array.isArray(transfers)`) et ajouter un message visible en cas d'erreur ou de liste vide. Fichier : `js/app.js`, lignes 7–11.
3. **Documenter ou retirer la garde `typeof document`** selon qu'elle sert à des tests ou non. Si elle est préventive sans usage, la supprimer simplifie le code. Fichier : `js/app.js`, ligne 18.

## Questions ouvertes

- La garde `typeof document` (ligne 18) est-elle utilisée par un test hors navigateur (Node.js, jsdom) ? Si non, est-elle préventive ou un reliquat ?
- Y a-t-il un plan pour ajouter des tests unitaires ou d'intégration à ce dépôt ? Si oui, les gardes `typeof window/document` ont leur raison d'être et devraient être documentées.
