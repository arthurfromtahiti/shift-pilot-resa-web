# CARTOGRAPHIE_CODE — shift-pilot-resa-web

> Dépôt minimaliste : 3 fichiers versionnés, 12 + 20 lignes. Structure plate sans module, sans build, sans dépendance.

## Arborescence physique

```
shift-pilot-resa-web/
├── README.md                 # Documentation basique
├── index.html                # Structure HTML (12 lignes)
└── js/
    └── app.js                # Logique applicative unique (20 lignes)
```

## Fichiers critiques

### `index.html` (12 lignes)
**Responsabilité** : structure et point d'entrée HTTP

**Contenu** :
```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Transferts inter-îles</title>
</head>
<body>
<h1>Transferts</h1>
<ul id="transfers-list"></ul>
<script src="js/app.js"></script>
</body>
</html>
```

**Points clés** :
- Charge `js/app.js` de façon synchrone (`<script>` sans `async`/`defer`, en fin de `<body>`)
- Conteneur pour la liste : `<ul id="transfers-list">` — vidée et remplie dynamiquement par le JS
- Aucune CSS interne, aucune balise de configuration (ex. injection de `window.API_BASE_URL` ici)
- Aucun formulaire, aucun interacteur au-delà du texte statique

**Dépendance** : `js/app.js` (charge ce fichier)

**Domaines couverts** : structure de l'interface de `consultation-transferts`

---

### `js/app.js` (20 lignes)
**Responsabilité** : totalité de la logique applicative

**Contenu structuré** :

#### Lignes 2–3 : Configuration d'endpoint
```javascript
const API_BASE_URL = (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```
**Rôle** : résoudre l'URL de base de l'API selon l'environnement
- Lit `window.API_BASE_URL` si défini (injection depuis la page hôte)
- Fallback : `"http://localhost:3100"` pour développement local
- Garde `typeof window !== "undefined"` : permet au script de s'exécuter en Node.js (tests) sans erreur
- Domaine : `integration-api`

#### Lignes 5–16 : Fonction `loadTransfers()`
```javascript
async function loadTransfers() {
  const response = await fetch(`${API_BASE_URL}/transfers`);
  const transfers = await response.json();

  const list = document.getElementById("transfers-list");
  list.innerHTML = "";
  for (const t of transfers) {
    const item = document.createElement("li");
    item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)`;
    list.appendChild(item);
  }
}
```

**Rôle** : seule fonction métier du dépôt — appeler l'API, parser la réponse, afficher la liste  
**Responsabilités concentrées ici** :
1. Appel réseau : `fetch(...)`
2. Désérialisation : `response.json()`
3. Accès DOM : `document.getElementById("transfers-list")`
4. Manipulation DOM : `innerHTML`, `createElement`, `appendChild`
5. Rendu du contenu : template littéral en `textContent`

**Preuves de sécurité** :
- Utilise `textContent` (pas `innerHTML`) pour le rendu → XSS protégé
- Pas d'`eval`, pas de `Function()`
- Seul `innerHTML = ""` (chaîne vide, pas de contenu externe)

**Absences critiques** :
- Pas de `try/catch` → exceptions non interceptées
- Pas de vérification `response.ok` → réponses 4xx/5xx parsées comme valides
- Pas de `Array.isArray(transfers)` → non-tableau entraîne `TypeError`

**Domaine** : `consultation-transferts` (métier), `integration-api` (technique)

#### Lignes 18–20 : Déclencheur
```javascript
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", loadTransfers);
}
```

**Rôle** : appeler `loadTransfers()` une fois la page chargée  
**Garde** : `typeof document !== "undefined"` pour isoler du contexte Node.js  
**Timing** : événement `DOMContentLoaded` (DOM disponible, scripts chargés, avant que le navigateur ne dessine)  
**Fréquence** : une seule fois par page load (aucun rechargement automatique, aucun bouton refresh)

---

### `README.md`
**Responsabilité** : documentation minimale

**Contenu** :
- Présentation générale du projet
- Mention de `shift-pilot-resa-api` (dépôt séparé)
- Promesse d'une « interface de réservation » (code absent ici)

**Limites** :
- Aucune explication du déploiement
- Aucune documentation de `window.API_BASE_URL`
- Aucun guide de contribution
- Aucune section sur les erreurs connues ou l'état de la réservation

**Domaine** : documentation générale (hors périmètre de synthèse des domaines métier)

---

## Flux de dépendances

```
index.html
  └── <script src="js/app.js">
      ├── const API_BASE_URL  (dépend de window.API_BASE_URL)
      ├── function loadTransfers()
      │   ├── fetch(`${API_BASE_URL}/transfers`)  → shift-pilot-resa-api
      │   ├── response.json()
      │   └── DOM: list.appendChild() → index.html:9 <ul id="transfers-list">
      └── DOMContentLoaded → loadTransfers()
```

## Points d'entrée et sorties

### Points d'entrée
1. **User action** : chargement de `index.html` dans le navigateur
2. **Système event** : événement `DOMContentLoaded` du navigateur

### Sorties
1. **Réseau** : requête HTTP `GET ${API_BASE_URL}/transfers` vers `shift-pilot-resa-api`
2. **Rendu DOM** : éléments `<li>` dans `<ul id="transfers-list">`
3. **Console** : exceptions non interceptées (erreurs réseau, type incorrects)

## Zones critiques (impact maximal)

| Zone | Lignes | Impact | Raison |
|------|--------|--------|--------|
| `loadTransfers()` | 5–16 | Maximal | Seule logique métier ; sans elle, aucune donnée n'est affichée |
| `fetch(...)` | 6 | Maximal | Seule source de données ; si elle échoue, tout échoue |
| `response.json()` | 7 | Élevé | Désérialisation sans garde ; type invalide → exception |
| `for...of transfers` | 11 | Élevé | Assume un tableau ; autres types → `TypeError` |
| `API_BASE_URL` | 2–3 | Élevé | Si absent ou mal injecté en prod, appel échoue silencieusement |

## Absence de structures courantes

| Structure | Statut | Note |
|-----------|--------|------|
| Modules ES (`import`/`export`) | ✗ | Tout est portée globale |
| Framework frontend | ✗ | HTML / JS vanille uniquement |
| Build system | ✗ | Pas de webpack, esbuild, vite |
| Dépendances npm | ✗ | Pas de `package.json` |
| Tests | ✗ | Aucun framework, aucun fichier de test |
| Configuration externe | ✗ | Fallback en dur ; aucun `.env`, `.config.js` |
| Server-side rendering | ✗ | Front statique pur |
| State management | ✗ | Aucun Redux, Zustand, Context ; pas d'état côté client |
| API client (fetch wrapper) | ✗ | Appel brut `fetch()` sans abstraction |
| Error handling | ✗ | Aucun `try/catch`, aucun gestion centralisée |

## Couches logiques

### Couche de configuration
- **Fichier** : `js/app.js:2-3`
- **Rôle** : résoudre l'URL de l'API selon l'environnement
- **Intégration** : `integration-api`

### Couche métier
- **Fichier** : `js/app.js:5-16` (fonction `loadTransfers()`)
- **Rôle** : orchestrer fetch → parse → render
- **Intégration** : `consultation-transferts`
- **Critique** : seule logique applicative visibilité ; tout y est concentré

### Couche présentation
- **Fichier** : `index.html`
- **Rôle** : structure HTML
- **État** : statique jusqu'au remplissage dynamique de `#transfers-list`

---

## Compréhension technique pour les contributeurs

### Modifier l'affichage d'un transfert
**Fichier** : `js/app.js:13`  
**Format actuel** : `` `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)` ``  
**Attention** : utilise `textContent` (sûr) ; ne pas passer à `innerHTML` sans assainissement.

### Ajouter un état de chargement
**Fichiers** : `index.html` (ajouter élément DOM pour le message) + `js/app.js:5-16` (manipuler cet élément avant/après fetch).

### Ajouter une gestion d'erreur
**Fichier** : `js/app.js:5-16`  
**Étapes** :
1. Wrapper le bloc `fetch` dans `try/catch`
2. Vérifier `response.ok` après le fetch
3. Vérifier `Array.isArray(transfers)` avant la boucle
4. Afficher un message d'erreur (créer un `<div id="error">` dans `index.html`)

### Changer l'URL API en développement
**Fichier** : `js/app.js:3`  
**Actuel** : fallback `"http://localhost:3100"`  
**Modification** : change la valeur fallback OU injecte `window.API_BASE_URL` depuis la page hôte.

### Tester le script en Node.js
**Possible** : oui, car les gardes `typeof window` et `typeof document` isolent le code navigateur.  
**Exemple** : loader le script + mocker `fetch` globalement + appeler `loadTransfers()`.

---

## Dépendances externes

### Dépendances métier
- **API distante** : `shift-pilot-resa-api` sur endpoint `/transfers`
- **Contrat API** : tableau JSON avec champs `from`, `to`, `price`, `availableSeats`
- **Forme exacte** : `INCONNU` (pas de schéma dans ce dépôt)

### Dépendances techniques
- **Navigateur** : HTML5, DOM API, ES2017 (`async/await`)
- **Infrastructure** : serveur statique servant `index.html`
- **Variable d'injection** : `window.API_BASE_URL` (doit être injectée par la page hôte avant le chargement de `js/app.js`)

## Détoxification suggérée (sans urgence)

| Niveau | Action | Bénéfice |
|--------|--------|----------|
| Critique | Ajouter `try/catch` + gestion d'erreur | Diagnostic clair en cas de défaillance |
| Élevé | Encapsuler dans IIFE ou module | Isolation de portée ; évite collisions |
| Élevé | Extraire constante pour endpoint `/transfers` | Centralise les points de couplage API |
| Moyen | Valider le type de la réponse | Protège contre des changements API silencieux |
| Moyen | Documenter `window.API_BASE_URL` | Évite les erreurs de déploiement |
| Faible | Ajouter formatage monétaire | Améliore lisibilité (1500 → 1 500 XPF) |

