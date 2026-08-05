# Relecture — FUNCTIONAL_AUDIT.md

## Verdict global

**Bon** — L'audit est exploitable sans réserve bloquante. Le constat d'absence de réservation est prouvé par grep, les statuts sont correctement appliqués, les citations de lignes sont exactes. Une omission mineure (garde `typeof document` à la ligne 18) déjà signalée dans la relecture du workflow n'est pas un défaut bloquant dans un audit fonctionnel.

## Problèmes bloquants

Aucun.

## Problèmes mineurs

**Garde `if (typeof document !== "undefined")` (ligne 18) non mentionnée dans la description du déclenchement.**
- Section concernée : « Au chargement de la page, `loadTransfers()` est déclenchée (`js/app.js`, ligne 19) »
- Réalité : le `document.addEventListener` à la ligne 19 est conditionnel à la garde de la ligne 18. La citation de la ligne 19 est exacte, mais la garde est omise.
- Impact : la description du point d'entrée est incomplète. Non bloquant pour la compréhension fonctionnelle, ce pattern est déjà signalé dans `RELECTURE_WORKFLOW_AFFICHAGE_TRANSFERTS.md`. L'auditeur peut en prendre note pour ses futurs livrables.

## Points vérifiés et corrects

**1. Fonctionnalité implémentée — prouvée.**
`loadTransfers()` définie à `js/app.js:5`, accès aux quatre champs `t.from`, `t.to`, `t.price`, `t.availableSeats` à `js/app.js:13`, rendu dans `<ul id="transfers-list">` de `index.html:9`. Vérifié. ✓

**2. Absence de réservation — prouvée par `VÉRIFIÉ_CODE`.**
L'audit déclare un grep sur `reserv`, `booking`, `panier`, `cart`, `book`, `order`, `commande` → 0 résultat. Sur un dépôt de 20 lignes de JS + 12 lignes de HTML, l'absence est vérifiable exhaustivement. ✓

**3. Écart README / code — correctement qualifié.**
Citation `README.md:3` (« interface de réservation de transferts inter-îles ») confrontée au code existant : légitimement `VÉRIFIÉ_CODE`. L'hypothèse sur la réservation prévue (« dans ce dépôt / dans l'API / dans un troisième dépôt ») est correctement qualifiée `HYPOTHÈSE`. ✓

**4. États limites identifiés et sourcés.**
- Absence d'état de chargement : `js/app.js:6-15`, `<ul>` vide sans indicateur. Vérifié. ✓
- Absence d'état d'erreur : pas de `try/catch`, pas de garde `response.ok`. `js/app.js:6-7`. Vérifié. ✓
- Absence d'état vide explicite : boucle `for...of` à zéro itération → `<ul>` vide sans message. `js/app.js:11-15`. Vérifié. ✓

**5. XPF codé en dur — `VÉRIFIÉ_CODE` exact.**
`js/app.js:13` : `${t.price} XPF`. Vérifié. ✓

**6. Aucun secret recopié.** ✓

## Recommandations de correction

Aucune correction requise. La mention de la garde ligne 18 serait un raffinement bienvenu mais non bloquant.
