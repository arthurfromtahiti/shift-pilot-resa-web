# CDC_FONCTIONNEL — shift-pilot-resa-web

> Cahier des charges fonctionnel — ce que le logiciel fait réellement pour le client, selon quelles règles, et vers quel objectif.

## Contexte métier

### Problème et raison d'être

Les voyageurs en Polynésie française ont besoin de connaître les **transferts inter-îles disponibles** (liaisons par bateau ou navire) afin de planifier leurs déplacements. Le prix en XPF et le nombre de places disponibles sont des critères de décision. Ce produit offre une **vitrine lisible et à jour** de cette offre de mobilité.

### Périmètre fonctionnel et écart déclaré

Le `README.md` annonce une « **interface de réservation** de transferts inter-îles ». Le code réalisé implémente uniquement le **catalogue en consultation — affichage de la liste**, sans aucun mécanisme de réservation (ni formulaire, ni panier, ni appel POST/PUT). Cet écart est assumé comme une portée de pilote : la consultation est livrable de façon immédiate et autonome, la réservation dépend de la logique métier qui vit probablement dans `shift-pilot-resa-api` ou dans une itération future. **Clarification attendue** : la réservation doit-elle être ajoutée côté front dans une prochaine itération ?

## Acteurs et capacités

### Utilisateur final

- **Peut** : accéder à la page web et voir instantanément la liste de tous les transferts inter-îles disponibles (origine, destination, prix en XPF, places restantes)
- **Ne peut pas** : chercher, filtrer, trier, voir les détails d'un transfert, réserver une place
- **Interaction requise** : aucune — l'affichage est automatique au chargement de la page

### API distant — `shift-pilot-resa-api`

- **Fournit** : le tableau de transferts au endpoint `GET /transfers` — au minimum les champs `from`, `to`, `price`, `availableSeats`, probablement d'autres champs non utilisés par ce front
- **Protocole** : HTTP GET, réponse JSON
- **Authentification** : aucune observable dans ce front — l'API est consommée en lecture anonyme ou avec un token injecté par la page hôte
- **Contrat implicite** : les 4 champs affichés sont directement accédés sans validation — tout changement de nom ou de type côté API produirait un `undefined` côté front

### Environnement d'exécution

- **Navigateur web** : JavaScript ES6 natif, pas de polyfills
- **Serveur** : page HTML statique, configuration injectée via une variable globale `window.API_BASE_URL`

## Parcours fonctionnels

### Flux principal — Affichage du catalogue de transferts

**Type** : `user_journey` (lecture / affichage)  
**Criticité** : **HAUTE** — c'est l'unique fonction du produit ; sans elle, la page est vide et inutile  
**Confiance** : high (code exhaustivement visible)

#### Objectif
Permettre à l'utilisateur de voir, dès l'ouverture de la page, la liste complète des transferts disponibles avec leurs prix et disponibilités.

#### Déclencheur
Chargement de la page `index.html` dans un navigateur web.

#### Étapes

1. **Chargement du DOM**  
   Le navigateur charge et analyse `index.html` — le titre `<h1>Transferts</h1>` et le conteneur `<ul id="transfers-list">` (vides) sont rendus. Le script `js/app.js` est chargé (`<script src="js/app.js">`).

2. **Résolution de l'URL de l'API**  
   Au chargement de `js/app.js`, la variable `API_BASE_URL` est résolue :
   ```javascript
   (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100"
   ```
   - Si `window.API_BASE_URL` a été injecté par la page hôte, c'est cette valeur qui est utilisée
   - Sinon, fallback vers `http://localhost:3100` (local en développement)

3. **Événement `DOMContentLoaded`**  
   Une fois que le DOM est entièrement parsé (balises HTML analysées et éléments créés), l'événement `DOMContentLoaded` est émis. La fonction `loadTransfers()` est déclenchée.

4. **Appel réseau vers l'API**  
   ```javascript
   const response = await fetch(`${API_BASE_URL}/transfers`);
   const transfers = await response.json();
   ```
   - Requête GET vers `${API_BASE_URL}/transfers`
   - Aucun header d'authentification
   - Pas de paramètre de query
   - La réponse est désérialisée comme JSON

5. **Réinitialisation du conteneur**  
   ```javascript
   const list = document.getElementById("transfers-list");
   list.innerHTML = "";
   ```
   La `<ul id="transfers-list">` est vidée (reliquat de prudence : permet de rappeler `loadTransfers()` sans accumulation de doublons).

6. **Rendu de chaque transfert**  
   ```javascript
   for (const t of transfers) {
     const item = document.createElement("li");
     item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)`;
     list.appendChild(item);
   }
   ```
   - Pour chaque objet `transfer` du tableau, un `<li>` est créé
   - Le contenu textuel est : `[origine] → [destination] — [prix] XPF ([places] places)`
   - L'élément est inséré dans la `<ul>`

#### États finaux (cas nominal)

- **Succès** : La liste des transferts s'affiche avec tous les détails (prix en XPF, places disponibles). L'utilisateur peut lire et comparer les transferts.

#### Règles métier associées

1. **Affichage exhaustif et automatique**  
   - Aucun clic ni interaction n'est requis
   - Tous les transferts retournés par l'API sont affichés (pas de pagination, pas de limite visible dans ce code)
   - Affichage automatique au chargement de la page

2. **Unité monétaire : XPF (Fixed)**  
   - Le symbole `XPF` est codé en dur dans le template de rendu (`js/app.js`, ligne 13)
   - Non configurable, non localisable
   - Assumption : tous les prix de l'API sont en XPF

3. **Quatre champs obligatoires pour l'affichage**  
   - `from` : origine du transfert
   - `to` : destination du transfert
   - `price` : tarif du transfert
   - `availableSeats` : nombre de places disponibles
   - **Chacun est accédé directement sans validation.** Un champ absent produit `undefined` dans le rendu.

4. **Sémantique des places disponibles**  
   - Le champ `availableSeats` est affiché tel quel
   - Interprétation supposée : `0` = complet, `> 0` = places libres
   - Aucune logique du front ne dépend de cette valeur (pas de masquage de transfert complet, pas de désactivation de bouton)

### Cas de bord et défaillances — En l'état du code

#### Cas : API injoignable ou erreur réseau

**Comportement** : Exception non capturée — `fetch()` lève une `Promise` rejetée, aucun `try/catch`.  
**Résultat utilisateur** : Page affiche une `<ul>` vide, aucun message d'erreur. Indiscernable d'une liste vide.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter un `try/catch` et un message d'erreur visible à l'utilisateur.

#### Cas : API renvoie une réponse 4xx ou 5xx

**Comportement** : `response.ok` n'est pas vérifiée. `response.json()` peut réussir (si le corps est du JSON) ou rejeter (si le corps n'est pas du JSON). Aucune gestion.  
**Résultat utilisateur** : Page affiche une `<ul>` vide ou lève une exception non capturée selon la nature de la réponse.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Vérifier `if (!response.ok) throw new Error(...)` après le `fetch()`.

#### Cas : API renvoie un objet ou `null` au lieu d'un tableau

**Comportement** : La boucle `for (const t of transfers)` échoue sur un non-itérable → `TypeError` non capturée.  
**Résultat utilisateur** : Page affiche une `<ul>` vide avec erreur navigateur.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Valider `Array.isArray(transfers)` avant d'itérer.

#### Cas : Transfert avec champ(s) manquant(s)

**Comportement** : Accès direct sans vérification — `t.from` renvoie `undefined` si absent.  
**Résultat utilisateur** : `<li>` affiche `undefined → undefined — undefined XPF (undefined places)`.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter une validation ou un filtrage des transferts incomplets. Ou documenter le contrat attendu de l'API.

#### Cas : Liste vide (aucun transfert disponible ce jour)

**Comportement** : Boucle s'exécute 0 fois — `<ul>` reste vide.  
**Résultat utilisateur** : Indéterminable d'une erreur API.  
**Confiance** : `VÉRIFIÉ_CODE`  
**Recommandation** : Ajouter un message « Aucun transfert disponible » si `transfers.length === 0`.

## Données consommées

### Ressource `transfer` (tableau retourné par `GET /transfers`)

| Champ | Utilisé ? | Type (observé) | Type (attendu) | Obligatoire ? | Notes |
|-------|-----------|---|---|---|---|
| `from` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : origine du transfert |
| `to` | ✓ Oui | Chaîne | Chaîne (nom d'île) | Oui | Affichage : destination du transfert |
| `price` | ✓ Oui | Nombre ou chaîne | Nombre (XPF) | Oui | Affichage : tarif du transfert |
| `availableSeats` | ✓ Oui | Nombre | Nombre entier | Oui | Affichage : places restantes |
| *Autres champs* | ✗ Non | ? | ? | ? | L'API peut renvoyer des identifiants, horaires, opérateurs, statut — ce front ne les utilise pas |

**Confiance**
- `VÉRIFIÉ_CODE` pour l'usage des 4 champs : lisibles dans `js/app.js` ligne 13
- `INCONNU` pour la forme complète et les types exacts : l'API peut renvoyer d'autres champs ou avoir des contraintes non observables depuis ce dépôt

### Configuration de l'URL de l'API

| Variable | Valeur (développement) | Valeur (production) | Notes |
|----------|---|---|---|
| `window.API_BASE_URL` | Non injected → fallback `http://localhost:3100` | Injecté par la page hôte (mécanisme non versionné) | Configuration externe, pas définie dans ce dépôt |

## Règles métier résumées

1. **Affichage automatique sans interaction** → le front ne demande rien à l'utilisateur
2. **Unité XPF codée en dur** → aucune flexibilité de devise
3. **Quatre champs affichés tels quels** → aucun formatage du prix (décimales ?), aucune validation
4. **Tableau exhaustif** → pas de pagination, pas de limite
5. **Aucune réservation** → le front ne fait que lire

## Délimitation du périmètre

### Hors périmètre

- **Réservation** : pas implémentée dans ce workspace (probablement API ou itération future)
- **Filtres, tris, recherche** : aucun mécanisme
- **Détail d'un transfert** : pas de page de détail
- **Authentification** : pas de login, consommation anonyme supposée
- **Localisation / multilingue** : interface en français, devise en XPF, non configurable
- **État de chargement** : pas de spinner ni message "Chargement..."
- **Gestion d'erreur utilisateur** : pas de message d'erreur affiché
- **Accessibilité** : pas de considération WCAG documentée
- **Responsive / mobile** : pas de media queries, pas de test multi-device

### Inachevé ou indéterminable

- **Réservation** : revendiquée mais non codée — dépend d'une décision architecturale
- **Rafraîchissement en temps réel** : la fonction `loadTransfers()` peut théoriquement être rappelée, mais aucun déclencheur (polling, WebSocket) n'existe dans le code
- **Injection de `window.API_BASE_URL` en production** : mécanisme externe, non documenté ni versionné

## Preuves et confiance

Tous les constats fonctionnels sont issus de lectures exhaustives :

- `js/app.js` : 20 lignes, entièrement lues
- `index.html` : 12 lignes, entièrement lues
- `README.md` : 8 lignes, entièrement lues
- Aucune autre source de code fonctionnel dans ce dépôt

**Confiance globale du CDC : high** — la portée réelle du produit est claire et documentée. Les incertitudes (forme API, mécanisme d'injection) sont explicitement délimitées.
