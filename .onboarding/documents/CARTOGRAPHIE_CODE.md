# CARTOGRAPHIE_CODE — shift-pilot-resa-web

Structure technique, domaines → fichiers, points d'entrée critiques.

## Structure générale

```
shift-pilot-resa-web/
├── index.html              # Point d'entrée HTML
├── js/
│   └── app.js             # Unique fichier de logique exécutable
├── README.md              # Documentation projet
└── .git                   # Historique (un seul commit : init)
```

**Taille** : 3 fichiers versionnés utiles. Aucune dépendance externe, aucun build, aucun framework.

## Domaines et fichiers

### Domaine 1 — Consultation des transferts (`consultation-transferts`)

**Catégorie** : métier (cœur du produit)  
**Priorité** : Critique  
**Fichiers**

| Fichier | Rôle | Lignes utiles | Criticité |
|---------|------|---|---|
| `js/app.js` | Fonction `loadTransfers()` qui récupère et affiche les transferts | 5–15 | **CRITIQUE** — c'est toute la valeur métier du produit |
| `index.html` | Conteneur de rendu `<ul id="transfers-list">` | 9 | Haute — point d'ancrage du DOM |

**Entrée** : événement `DOMContentLoaded` du navigateur  
**Sortie** : liste HTML de transferts affichée  
**Logique**
```javascript
// js/app.js, lignes 5–15
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

**Points d'attention**
- Pas de gestion d'erreur réseau (pas de `try/catch`)
- Pas de vérification de `response.ok`
- Pas de validation de la structure `transfers` (suppose un tableau)
- Pas de validation des champs `from`, `to`, `price`, `availableSeats` (un absent → `undefined` affiché)
- Contrat implicite avec l'API : ces 4 champs doivent exister

**Hotspot n°1** du dépôt : si une erreur API se produit ici, la page reste silencieusement vide.

### Domaine 2 — Intégration API (`integration-api`)

**Catégorie** : technique (support)  
**Priorité** : Soutien  
**Fichiers**

| Fichier | Rôle | Lignes | Criticité |
|---------|------|---|---|
| `js/app.js` | Configuration et appel réseau vers `shift-pilot-resa-api` | 2–3, 6 | Haute — point de couplage |

**Configuration d'URL**
```javascript
// js/app.js, lignes 2–3
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```

- **Mécanisme** : lecture de `window.API_BASE_URL` injectée par la page hôte, fallback vers `localhost:3100`
- **En développement** : fallback automatique vers `localhost:3100` — aucune configuration manuelle requise
- **En production** : nécessite une injection de `window.API_BASE_URL` par un mécanisme externe non versionné (probablement script serveur ou build)

**Appel réseau**
```javascript
// js/app.js, lignes 6–7
const response = await fetch(`${API_BASE_URL}/transfers`);
const transfers = await response.json();
```

- Endpoint : `GET ${API_BASE_URL}/transfers`
- Pas d'authentification visible
- Pas de header personnalisé
- Pas de gestion du timeout
- Pas de retry

**Couplage avec `shift-pilot-resa-api`**
- Endpoint consommé : `/transfers` → tableau JSON de transferts
- Forme minimale attendue : tableau contenant des objets avec `{ from, to, price, availableSeats, ... }`
- Aucun schéma n'existe dans ce dépôt pour valider ou documenter ce contrat

**Hotspot n°2** : couplage implicite avec le schéma de l'API. Toute évolution du côté API (renommage de champ, changement de type) casse silencieusement le rendu.

### Autres

Aucun autre domaine n'a de logique codée dans ce dépôt. Les domaines suivants sont revendiqués mais absents :

- **Réservation** : aucun code (`grep` sur `reserv|booking|panier|cart` → 0)
- **Authentification** : aucune (consommation anonyme)
- **Persistance locale** : aucune (`grep` sur `localStorage|sessionStorage|indexedDB` → 0)
- **Routing** : aucun (une page unique)

## Points d'entrée

### Primaire — Chargement de la page

```
Navigateur accède à index.html
     ↓
Navigateur charge et analyse index.html
     ↓
Navigateur rencontre <script src="js/app.js">
     ↓
js/app.js est parsé et exécuté
     ↓
API_BASE_URL est résolu
     ↓
Événement DOMContentLoaded est émis
     ↓
loadTransfers() est appelée
     ↓
fetch(`${API_BASE_URL}/transfers`) est lancé
     ↓
Réponse JSON est rendue dans le DOM
```

**Fichier d'entrée** : `index.html` (ligne 10 : `<script src="js/app.js">`)  
**Événement déclencheur** : `DOMContentLoaded` (js/app.js, ligne 19)  
**Fonction déclenchée** : `loadTransfers()` (js/app.js, lignes 5–16)

### Secondaire — Rappel manuel de `loadTransfers()` (théorique)

La fonction est exportée implicitement au scope global (pas de `export`, pas de module). Un code externe pourrait, en théorie, appeler `loadTransfers()` à nouveau pour rafraîchir la liste. Aucun mécanisme d'appel n'existe dans ce dépôt (pas de bouton, pas de polling, pas de WebSocket).

## Fichiers critiques

| Fichier | Raison | Risque |
|---------|--------|---------|
| `js/app.js` | **Unique** point de logique exécutable — toute la valeur du produit y est | Alto — bugue ici = produit non fonctionnel |
| `index.html` | Point d'entrée et conteneur de rendu — si l'id `transfers-list` change, le JS casse | Moyen — changement rare et visible |

## Fichiers de documentation

| Fichier | Contenu |
|---------|---------|
| `README.md` | Description du projet, stack technique, mention de `shift-pilot-resa-api` |
| `.onboarding/` (ce dépôt) | Carte des domaines, workflows, audits, documents de référence |

## Dépendances externes

### Code

- **`shift-pilot-resa-api`** (dépôt séparé, même projet)  
  Endpoint : `GET /transfers`  
  Contrat : tableau JSON de transferts  
  Observabilité : forme réelle non visible depuis ce dépôt  
  Risque : couplage implicite, fragilité à l'évolution de l'API

### Environnement d'exécution

- **`window.API_BASE_URL`** (injected par la page hôte)  
  Mécanisme : non versionné, supposé côté serveur ou build  
  Fallback : `http://localhost:3100`  
  Risque : si l'injection échoue en production, l'app cible silencieusement localhost

- **Navigateur web avec ES6 natif**  
  Pas de polyfill, pas de transpilation

## Hotspots et zones critiques

### Hotspot 1 — Appel réseau non gardé (`js/app.js`, lignes 6–7)

```javascript
const response = await fetch(`${API_BASE_URL}/transfers`);
const transfers = await response.json();
```

**Risque** : API injoignable, erreur 5xx, réponse non-JSON, non-tableau → exception non capturée, page vide sans message.

**Priorité** : **Critique** — premier correctif avant production.

### Hotspot 2 — Couplage implicite avec le schéma API (`js/app.js`, ligne 13)

```javascript
item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)`;
```

**Risque** : un champ renommé ou absent côté API → `undefined` affiché sans erreur.

**Priorité** : **Haute** — fragile à l'évolution du partenaire (l'API).

### Hotspot 3 — Injection de configuration non documentée (`js/app.js`, lignes 2–3)

```javascript
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```

**Risque** : mécanisme d'injection en production non versionné, comportement en prod non reproductible localement.

**Priorité** : **Moyenne** — acceptable en pilote, critique en production.

## Chemins de données

```
Utilisateur ouvre la page
     ↓
index.html est chargé
     ↓
js/app.js crée variable API_BASE_URL (résout window.API_BASE_URL ou fallback)
     ↓
DOMContentLoaded : loadTransfers() est appelée
     ↓
fetch(`${API_BASE_URL}/transfers`) → réseau
     ↓
shift-pilot-resa-api reçoit GET /transfers
     ↓
API renvoie tableau JSON
     ↓
js/app.js désérialise et itère sur transfers
     ↓
Pour chaque transfer, crée <li> avec textContent interpolé
     ↓
Ajoute <li> à <ul id="transfers-list">
     ↓
Navigateur affiche la liste
```

Aucun état local n'est persisté — tout est jetable après rendu.

## Sécurité et performances

### Sécurité

- **XSS** : Utilisé `textContent` (pas `innerHTML`) → données API ne peuvent pas s'exécuter
- **Secrets** : aucun (grep sur `key|token|secret|password` → 0)
- **Authentification** : aucune requise pour ce front — API consommée anonymement
- **CORS** : politiques entièrement côté `shift-pilot-resa-api` — non vérifiable ici

### Performance

- **Pas de bundle, pas de tree-shake** : fichier JS directement livré
- **Rendu DOM** : pas de virtualization, pas de pagination — O(n) en nombre de transferts
- **Pas de cache côté client** : le DOM n'est pas re-utilisé entre appels à `loadTransfers()`

## Règles de maintenance

1. **Changement du contenant HTML ?** → vérifier que l'id `transfers-list` reste valide
2. **Changement de l'API ?** → vérifier que les 4 champs (`from`, `to`, `price`, `availableSeats`) restent disponibles
3. **Changement du déploiement ?** → documenter le nouveau mécanisme d'injection de `window.API_BASE_URL`
4. **Ajout de fonctionnalité ?** → considérer une refactorisation légère (extraction `api.js`, `render.js`) avant d'ajouter du code

## Preuves

- Tous les fichiers listés sont versionés et ont été lus en entier
- Aucun fichier caché, aucun code généré, aucune boîte noire
- `git log` : un seul commit : `init: pilote de test SHIFT/Paperclip`
