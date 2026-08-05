# CAHIER_RECETTE — shift-pilot-resa-web

> Plan de test manuel et automatisé. Étapes à vérifier pour valider que l'application fonctionne selon ses spécifications.

## Préalables

### Environnement local
- Navigateur moderne (Chrome, Firefox, Safari, Edge avec support ES2017 `async/await`)
- API locale `shift-pilot-resa-api` disponible sur `http://localhost:3100` (ou adresse configurée)
- Accès au code source : `shift-pilot-resa-web/` clôné et accessible en local

### Points de contrôle avant les tests
- [ ] `index.html` existe et contient `<h1>Transferts</h1>` + `<ul id="transfers-list">`
- [ ] `js/app.js` existe et contient `loadTransfers()` + `API_BASE_URL`
- [ ] `shift-pilot-resa-api` est accessible et répond sur `/transfers` avec du JSON valide
- [ ] La console développeur du navigateur est ouverte pour déboguer

---

## Parcours 1 : Affichage nominal (API saine)

**Objectif** : vérifier que la liste des transferts s'affiche correctement quand l'API fonctionne.

### Scénario 1.1 : Chargement avec fallback localhost
**Prérequis** : `shift-pilot-resa-api` accessible sur `http://localhost:3100`

1. Ouvrir `index.html` dans le navigateur (ex. `file:///path/to/index.html`)
2. Observer la page :
   - [ ] Le titre `<h1>Transferts</h1>` est visible
   - [ ] La liste est initialement vide (`<ul id="transfers-list">` sans enfants)
3. Attendre 1–2 secondes (temps du fetch)
4. Vérifier la liste remplie :
   - [ ] Chaque ligne affiche `de → vers — prix XPF (N places)`
   - [ ] Exemple attendu : `Tahiti → Moorea — 5000 XPF (12 places)`
   - [ ] Au moins 2–3 lignes sont affichées (ou le nombre renvoyé par l'API)
5. Ouvrir la console développeur (`F12` > Onglet Console) :
   - [ ] Aucune erreur en rouge (sauf corsage possible si l'API n'a pas de header CORS)

**Résultat attendu** : liste complète, affichée correctement.

---

### Scénario 1.2 : Chargement avec injection `window.API_BASE_URL`
**Prérequis** : serveur web (ex. `python -m http.server 8000` dans le dépôt)

1. Servir la page via HTTP en injectant `window.API_BASE_URL` AVANT le chargement de `js/app.js`.
   - Option A : modifier `index.html` temporairement pour ajouter une balise `<script>` avant `js/app.js` :
     ```html
     <script>window.API_BASE_URL = "http://autre-api.local:3100";</script>
     <script src="js/app.js"></script>
     ```
   - Option B : utiliser un proxy / reverse-proxy côté serveur qui injecte la variable
2. Charger `http://localhost:8000/index.html`
3. Vérifier :
   - [ ] L'API différente est appelée (ouvrir Network tab → vérifier URL de la requête fetch)
   - [ ] La liste s'affiche si l'API alternative fonctionne
   - [ ] Si l'API alternative est inaccessible, observer le comportement (scénario 2.2)

**Résultat attendu** : `window.API_BASE_URL` surcharge correctement le fallback.

---

### Scénario 1.3 : Formatage des données
**Prérequis** : une liste est affichée (scénario 1.1)

1. Inspecter au moins 3 lignes de la liste pour vérifier :
   - [ ] Format exact : `from → to — price XPF (seats places)` (avec espaces corrects)
   - [ ] `from` et `to` sont des chaînes (pas `undefined`)
   - [ ] `price` est un nombre (ex. `5000`, pas `5000.00`, pas `"5000"`)
   - [ ] `seats` est un nombre entier (ex. `12`, pas `12.0`)
   - [ ] Ligne avec 0 place s'affiche : `... — ... XPF (0 places)` (pas de style particulier, pas d'exclusion)

**Résultat attendu** : données affichées tel qu'elles arrivent de l'API, sans transformation.

---

## Parcours 2 : Défaillances (API ou réseau)

### Scénario 2.1 : API injoignable (réseau)
**Prérequis** : arrêter `shift-pilot-resa-api` ou le serveur hôte

1. Ouvrir `index.html`
2. Observer après 5 secondes (timeout réseau) :
   - [ ] La liste reste vide (pas de message affiché)
   - [ ] Ouvrir la console : une erreur du type `Failed to fetch` ou `NetworkError` doit être visible
   - **Comportement actuel** : utilisateur voit une page vide sans explication — UX dégradée
3. Rechargement (`F5`) avec l'API revenue :
   - [ ] La liste se remplit à nouveau

**Résultat attendu** : la défaillance est détectée en console, mais invisible pour l'utilisateur.  
**Amélioration recommandée** : ajouter un message d'erreur visible (« Erreur de chargement »).

---

### Scénario 2.2 : Réponse HTTP invalide (4xx/5xx)
**Prérequis** : modifier temporairement l'API pour renvoyer `500 Internal Server Error` avec un corps JSON

1. Configurer l'API pour renvoyer : `HTTP 500` + `{ error: "Database unavailable" }`
2. Ouvrir `index.html`
3. Observer après 1–2 secondes :
   - [ ] La liste reste vide
   - [ ] Ouvrir la console : une `TypeError` du type `transfers is not iterable` doit être visible
   - **Problème** : l'erreur HTTP n'est pas détectée ; le JSON invalide (objet, pas tableau) cause une exception
4. Revenir à une réponse `200 OK` valide :
   - [ ] La liste se remplit normalement

**Résultat attendu** : erreur HTTP acceptée comme valide ; TypeError levée à la boucle.  
**Amélioration recommandée** : vérifier `response.ok` avant de parser.

---

### Scénario 2.3 : Réponse non-tableau
**Prérequis** : modifier l'API pour renvoyer un objet au lieu d'un tableau

1. Configurer l'API pour renvoyer : `{ "data": [...] }` au lieu de `[...]`
2. Ouvrir `index.html`
3. Observer :
   - [ ] La liste reste vide
   - [ ] Console : `TypeError: transfers is not iterable`
   - **Cause** : `for (const t of transfers)` attend un itérable ; un objet valide n'en est pas un

**Résultat attendu** : TypeError non capturée.  
**Amélioration recommandée** : ajouter `if (!Array.isArray(transfers)) return;`

---

### Scénario 2.4 : Champs manquants
**Prérequis** : modifier l'API pour renvoyer un transfert sans certains champs

1. Configurer l'API pour renvoyer :
   ```json
   [
     { "from": "Tahiti", "to": "Moorea" }  // Manque price et availableSeats
   ]
   ```
2. Ouvrir `index.html`
3. Vérifier la liste :
   - [ ] La ligne affiche : `Tahiti → Moorea — undefined XPF (undefined places)`
   - **Problème** : affichage illisible, aucune alerte

**Résultat attendu** : valeurs `undefined` visibles mais confuses pour l'utilisateur.  
**Amélioration recommandée** : valider la présence des champs clés avant de les afficher.

---

### Scénario 2.5 : Réponse JSON invalide (syntaxe malformée)
**Prérequis** : modifier l'API pour renvoyer du JSON invalide

1. Configurer l'API pour renvoyer : `{ "data": [ ... ` (JSON incomplet/cassé)
2. Ouvrir `index.html`
3. Vérifier la console :
   - [ ] Erreur `SyntaxError: Unexpected token ...` (parse JSON échoue)
   - [ ] La liste reste vide

**Résultat attendu** : SyntaxError non capturée.  
**Amélioration recommandée** : wrapper le fetch dans `try/catch`.

---

## Parcours 3 : Configuration d'endpoint

### Scénario 3.1 : Fallback en l'absence de `window.API_BASE_URL`
**Prérequis** : charger la page SANS injecter `window.API_BASE_URL`

1. Ouvrir `index.html` directement (sans serveur web)
2. Ouvrir DevTools > Console, exécuter :
   ```javascript
   console.log(window.API_BASE_URL)  // doit afficher undefined
   ```
3. Vérifier que la requête fetch utilise le fallback :
   - [ ] DevTools > Network tab : chercher `transfers` → URL doit être `http://localhost:3100/transfers`

**Résultat attendu** : fallback `http://localhost:3100` est utilisé.

---

### Scénario 3.2 : Surcharge de `window.API_BASE_URL`
**Prérequis** : serveur web

1. Injecter `window.API_BASE_URL = "https://api.example.com"` avant le chargement de `js/app.js`
2. Ouvrir la page et vérifier :
   - [ ] DevTools > Network tab : URL fetch est `https://api.example.com/transfers` (pas le fallback localhost)

**Résultat attendu** : variable injectée surcharge le fallback.

---

### Scénario 3.3 : Variable vide ou `null` déclenche le fallback
**Prérequis** : injection possible

1. Injecter `window.API_BASE_URL = ""` (chaîne vide) OU `window.API_BASE_URL = null`
2. Vérifier :
   - [ ] DevTools > Network : l'URL est le fallback `http://localhost:3100/transfers` (pas vide ou null)
   - **Logique** : `"" || "http://localhost:3100"` → fallback ; `null || "http://localhost:3100"` → fallback

**Résultat attendu** : valeurs falsy déclenchent le fallback.

---

## Parcours 4 : Interactions utilisateur

### Scénario 4.1 : Absence de filtre/tri/sélection
**Condition** : une liste est affichée

1. Chercher dans l'interface :
   - [ ] Aucun champ de recherche
   - [ ] Aucun bouton de tri (A→Z, Z→A, prix croissant/décroissant)
   - [ ] Aucun bouton de sélection ou checkbox
   - [ ] Aucun bouton « Réserver »
   - [ ] Aucun bouton « Rafraîchir »
2. Tenter d'interagir avec la liste (cliquer sur un transfert) :
   - [ ] Aucune réaction (pas d'événement `click` écouté)

**Résultat attendu** : la liste est informative uniquement, aucune action n'est possible.

---

### Scénario 4.2 : Absence d'état de chargement
**Condition** : l'API répond lentement

1. Ralentir le réseau intentionnellement (DevTools > Network > Slow 3G) pour ajouter 5+ secondes de latence
2. Recharger la page (`F5`)
3. Observer les 5 premières secondes :
   - [ ] La liste est vide (pas de spinner)
   - [ ] Aucun texte « Chargement… »
   - [ ] Aucun squelette de liste
   - **Utilisateur voit** : page vide sans indication que quelque chose se passe

**Résultat attendu** : aucune indication de chargement en cours.  
**Amélioration recommandée** : afficher « Chargement… » jusqu'à la fin du fetch.

---

### Scénario 4.3 : Absence d'actualisation après chargement
**Condition** : une liste est affichée

1. Observer pendant 1 minute :
   - [ ] La liste ne change pas (pas de rafraîchissement périodique)
2. Vérifier qu'une modification côté API (ex. ajout d'un nouveau transfert) n'est PAS visible sans rechargement manuel

**Résultat attendu** : données statiques après le chargement initial.

---

## Parcours 5 : Validation de contrat API

### Scénario 5.1 : Champs attendus minimums
**Prérequis** : accès à `shift-pilot-resa-api`, un transfert au moins

1. Faire un appel manuel à l'API :
   ```bash
   curl http://localhost:3100/transfers
   ```
2. Valider la structure :
   - [ ] Réponse est un tableau JSON : `[{ ... }, ...]`
   - [ ] Chaque élément contient au minimum : `from`, `to`, `price`, `availableSeats`
   - [ ] Types attendus :
     - [ ] `from` : string
     - [ ] `to` : string
     - [ ] `price` : number (entier ou flottant ?)
     - [ ] `availableSeats` : integer
3. Vérifier qu'aucun champ obligatoire n'est manquant

**Résultat attendu** : contrat API respecté.  
**Note** : si d'autres champs existent (`id`, `departureTime`, etc.), documenter les dans le CDC.

---

### Scénario 5.2 : Valeurs limites
**Prérequis** : capacité à modifier l'API ou une donnée de test

1. Tester les valeurs limites :
   - [ ] Transfert avec `availableSeats: 0` s'affiche correctement (ex. `0 places`)
   - [ ] Transfert avec `availableSeats: 1` s'affiche (ex. `1 places` — singulier/pluriel non géré ?)
   - [ ] Prix très haut (ex. `999999`) s'affiche sans débordement
   - [ ] Prix avec décimales (ex. `5000.50`) s'affiche sans formatage spécial
   - [ ] Noms très longs (ex. `from: "Île Très Longue"`) s'affichent sans casse ou débordement
2. Vérifier qu'aucun cas limite ne casse l'interface

**Résultat attendu** : toutes les valeurs s'affichent sans erreur.

---

## Parcours 6 : Sécurité basique

### Scénario 6.1 : Protection XSS (données API malveillantes)
**Prérequis** : injection possible dans l'API

1. Configurer un transfert avec du contenu HTML/JS :
   ```json
   {
     "from": "<script>alert('XSS')</script>",
     "to": "Moorea",
     "price": 5000,
     "availableSeats": 10
   }
   ```
2. Charger la page :
   - [ ] Le texte s'affiche littéralement : `<script>alert('XSS')</script> → Moorea — ...`
   - [ ] Le script **ne s'exécute PAS** (pas d'alerte, pas de console log supplémentaire)
   - **Raison** : le code utilise `textContent` au lieu de `innerHTML`

**Résultat attendu** : XSS protégé.

---

### Scénario 6.2 : Pas de secret dans le code
**Test statique** : lire les fichiers source

1. Chercher dans `index.html`, `js/app.js`, `README.md` :
   - [ ] Aucun mot de passe, token ou clé API en clair
   - [ ] Aucun endpoint sensible en dur (à part `/transfers`, qui est public)
2. Chercher aussi : `password`, `secret`, `token`, `api.key`, `bearer`

**Résultat attendu** : aucun secret trouvé.

---

## Parcours 7 : Performance (optionnel pour un pilote)

### Scénario 7.1 : Temps de chargement
**Prérequis** : liste de 50+ transferts

1. DevTools > Performance tab
2. Recharger la page et enregistrer le profil (Ctrl+Shift+E)
3. Vérifier :
   - [ ] Le temps DOM Interactive < 1s (avant le fetch API)
   - [ ] Le temps jusqu'à l'affichage complet < 3s (selon le réseau)
4. Analyser le profil pour les points chauds :
   - [ ] `fetch()` : temps prévisible (réseau)
   - [ ] `createElement` / `appendChild` en boucle : temps linéaire (N transferts)

**Résultat attendu** : performance acceptable pour une liste de taille modérée.

---

### Scénario 7.2 : Utilisation mémoire
**Prérequis** : liste complète affichée

1. DevTools > Memory tab
2. Prendre un snapshot (heap snapshot)
3. Vérifier :
   - [ ] Pas de fuite mémoire évidente (ex. accumulateurs non libérés)
   - [ ] La liste de 50+ transferts consomme < 1MB

**Résultat attendu** : empreinte mémoire faible.

---

## Plan de régression (quand du code change)

Après **toute modification** à `js/app.js` ou `index.html`, exécuter les tests minimums :

1. **Scénario 1.1** (affichage nominal) — vérifie que le changement ne casse pas le chemin critique
2. **Scénario 2.1** (API injoignable) — vérifie que la gestion d'erreur ne s'est pas dégradée
3. **Scénario 3.1** (fallback) — vérifie que la configuration d'endpoint fonctionne toujours
4. **Scénario 6.1** (XSS) — vérifie que le rendu reste sûr

Ces 4 tests prennent < 2 minutes et couvrent 80 % des risques de régression.

---

## Preuves et références

**Workflows** (source de ces tests) :
- `WORKFLOW_AFFICHER_TRANSFERTS.md` — flux nominal et risques
- `WORKFLOW_CONFIGURATION_ENDPOINT.md` — mécanisme d'injection

**Audits** (contexte) :
- `FUNCTIONAL_AUDIT.md` — ce qui est/n'est pas implémenté
- `SECURITY_ROBUSTNESS_AUDIT.md` — risques identifiés
- `DATA_MODEL_AUDIT.md` — contrat API et validation

**Code source** :
- `js/app.js` (20 lignes)
- `index.html` (12 lignes)

