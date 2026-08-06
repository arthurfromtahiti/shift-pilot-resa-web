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

### Domaine 1 — Consultation et réservation de transferts (`transferts-reservation`)

**Catégorie** : métier (cœur du produit)  
**Priorité** : Critique  
**Fichiers**

| Fichier | Rôle | Lignes utiles | Criticité |
|---------|------|---|---|
| `js/app.js` | Fonctions d'affichage (`loadTransfers`), de réservation (`reserve`), d'annulation (`cancelReservation`), et état (`reservations` Map) | 6–73 | **CRITIQUE** — toute la logique métier du produit |
| `index.html` | Conteneur de rendu `<ul id="transfers-list">` | 9 | Haute — point d'ancrage du DOM |

**Entrée** : événement `DOMContentLoaded` du navigateur, clics sur boutons « Réserver » / « Annuler »  
**Sortie** : liste HTML de transferts avec boutons d'action, état des réservations  
**Logique principale**
```javascript
// js/app.js, lignes 8–40
export async function loadTransfers() {
  const list = document.getElementById("transfers-list");
  try {
    const response = await fetch(`${API_BASE_URL}/transfers`);
    if (!response.ok) {
      throw new Error(`Erreur serveur : ${response.status}`);
    }
    const transfers = await response.json();

    list.innerHTML = "";
    for (const t of transfers) {
      const item = document.createElement("li");
      item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`;

      const reservationId = reservations.get(t.id);
      if (reservationId) {
        const btn = document.createElement("button");
        btn.textContent = "Annuler";
        btn.addEventListener("click", () => cancelReservation(t.id, reservationId));
        item.appendChild(btn);
      } else if (t.seatsLeft > 0) {
        const btn = document.createElement("button");
        btn.textContent = "Réserver";
        btn.addEventListener("click", () => reserve(t.id));
        item.appendChild(btn);
      }

      list.appendChild(item);
    }
  } catch (err) {
    list.textContent = `Impossible de charger les transferts : ${err.message}`;
  }
}
```

**Fonctions supplémentaires**
- `reserve(transferId)` (lignes 42–59) : POST vers `/transfers/{transferId}/reserve`, met à jour `reservations` Map, rafraîchit la liste
- `cancelReservation(transferId, reservationId)` (lignes 61–76) : DELETE vers `/transfers/{transferId}/reservations/{reservationId}`, supprime de `reservations`, rafraîchit la liste

**Points d'attention**
- Gestion d'erreur avec `try/catch` et vérification `response.ok` présents (lignes 10–39)
- État client `reservations` (Map) n'est pas persisté — oublié au rechargement de page
- Pas de validation des champs `id`, `from`, `to`, `price`, `seatsLeft` — un absent → `undefined` affiché
- Contrat implicite avec l'API : champ `id` requis et unique pour chaque transfert
- Affichage des erreurs remplace entièrement le contenu du conteneur `list` (invasif en cas de liste large)

**Hotspot n°1** du dépôt : le champ `id` de chaque transfert doit exister et être stable — son absence ou mutation casse la gestion des réservations.

### Domaine 2 — Intégration API (`integration-api`)

**Catégorie** : technique (support)  
**Priorité** : Soutien  
**Fichiers**

| Fichier | Rôle | Lignes | Criticité |
|---------|------|---|---|
| `js/app.js` | Configuration et appels réseau vers `shift-pilot-resa-api` | 2–3, 11, 45–49, 65–67 | Haute — point de couplage critique |

**Configuration d'URL**
```javascript
// js/app.js, lignes 2–3
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```

- **Mécanisme** : lecture de `window.API_BASE_URL` injectée par la page hôte, fallback vers `localhost:3100`
- **En développement** : fallback automatique vers `localhost:3100` — aucune configuration manuelle requise
- **En production** : nécessite une injection de `window.API_BASE_URL` par un mécanisme externe non versionné (probablement script serveur ou build)

**Appels réseau**
```javascript
// js/app.js, ligne 11 — GET /transfers
const response = await fetch(`${API_BASE_URL}/transfers`);

// js/app.js, lignes 45–49 — POST /transfers/{id}/reserve
const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reserve`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seats: 1 }),
});

// js/app.js, lignes 64–67 — DELETE /transfers/{id}/reservations/{id}
const response = await fetch(
  `${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}`,
  { method: "DELETE" }
);
```

- **Endpoints consommés** :
  - `GET /transfers` : tableau JSON de transferts avec champs `id`, `from`, `to`, `price`, `seatsLeft`
  - `POST /transfers/{transferId}/reserve` : réserve une place (body: `{ seats: 1 }`), réponse: JSON contenant `reservationId`
  - `DELETE /transfers/{transferId}/reservations/{reservationId}` : annule une réservation
- Pas d'authentification visible
- Pas de header personnalisé au-delà de `Content-Type: application/json` pour POST
- Pas de gestion du timeout
- Pas de retry

**Couplage avec `shift-pilot-resa-api`**
- Endpoints consommés et contrats : voir ci-dessus
- Champ `id` sur transferts est critique pour l'indexation des réservations
- Forme exacte de la réponse POST et format de `reservationId` ne sont pas documentés
- Aucun schéma n'existe dans ce dépôt pour valider ou documenter ces contrats

**Hotspot n°2** : couplage implicite avec le schéma de l'API. Toute évolution du côté API (renommage de champ, absence du champ `id`, changement du format de `reservationId`) casse silencieusement le fonctionnement.

### Autres domaines

Les domaines suivants sont utilisés dans ce dépôt mais avec une portée limitée :

- **Persistance locale** : `Map` client (`reservations`) pour stocker les réservations de l'utilisateur dans la session courante — aucun `localStorage`, `sessionStorage`, ou `indexedDB` (`grep` → 0). État perdu au rechargement.
- **Authentification** : aucune visible dans le code — consommation anonyme de l'API, aucun token, aucun header d'autorisation.
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
**Événement déclencheur** : `DOMContentLoaded` (js/app.js, ligne 79)  
**Fonction déclenchée** : `loadTransfers()` (js/app.js, lignes 8–40)

### Secondaire — Rafraîchissement après action

La liste est automatiquement rafraîchie après chaque réservation ou annulation. Les fonctions `reserve()` (ligne 55) et `cancelReservation()` (ligne 72) appellent `loadTransfers()` à la suite de leur action API. Ce mécanisme de rappel n'est plus théorique : il est utilisé par les boutons d'action de la liste.

## Fichiers critiques

| Fichier | Raison | Risque |
|---------|--------|---------|
| `js/app.js` | **Unique** point de logique exécutable — toute la valeur du produit y est (affichage, réservation, annulation) | **CRITIQUE** — bugue ici = produit non fonctionnel |
| `index.html` | Point d'entrée et conteneur de rendu — si l'id `transfers-list` change, le JS casse ; `<script type="module">` est nécessaire pour l'export/import | Moyen — changement rare mais visible |

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

### Hotspot 1 — Couplage implicite avec le schéma API — champ `id` critique (`js/app.js`, lignes 22, 54, 71)

```javascript
const reservationId = reservations.get(t.id);  // ligne 22
reservations.set(transferId, data.reservationId);  // ligne 54
reservations.delete(transferId);  // ligne 71
```

**Risque** : le champ `id` de chaque transfert est utilisé comme clé pour stocker/récupérer les réservations. Son absence, mutation, ou instabilité casse complètement la gestion des réservations (mauvaise correspondance entre UI et état client).

**Priorité** : **CRITIQUE** — le champ `id` doit exister, être unique et stable pour chaque transfert.

### Hotspot 2 — Couplage implicite avec le schéma API — champs d'affichage (`js/app.js`, ligne 20)

```javascript
item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`;
```

**Risque** : un champ renommé ou absent côté API (`from`, `to`, `price`, `seatsLeft`) → `undefined` affiché sans erreur. Actuellement harmonisé suite au correctif SHIAAAAAAAAAAAAAAAAAAAAAAAA-311.

**Priorité** : **Moyenne** — fragile à l'évolution de l'API, mais actuellement en phase.

### Hotspot 3 — Gestion des erreurs invasive (`js/app.js`, lignes 37–39)

```javascript
} catch (err) {
  list.textContent = `Impossible de charger les transferts : ${err.message}`;
}
```

**Risque** : tout message d'erreur remplace entièrement le contenu du conteneur `list`. Sur une longue liste, un seul transfert qui échoue à traiter efface toute l'UI.

**Priorité** : **Moyenne** — affecte l'UX en cas d'erreur partielle, mais les scénarios d'erreur partielle sont rares (soit l'API répond entièrement, soit elle échoue).

### Hotspot 4 — Injection de configuration non documentée (`js/app.js`, lignes 2–3)

```javascript
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```

**Risque** : mécanisme d'injection en production non versionné, comportement en prod non reproductible localement.

**Priorité** : **Moyenne** — acceptable en pilote, critique en production si le mécanisme d'injection échoue.

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
2. **Changement de l'API ?** → vérifier que les 4 champs (`from`, `to`, `price`, `seatsLeft`) restent disponibles
3. **Changement du déploiement ?** → documenter le nouveau mécanisme d'injection de `window.API_BASE_URL`
4. **Ajout de fonctionnalité ?** → considérer une refactorisation légère (extraction `api.js`, `render.js`) avant d'ajouter du code

## Preuves

- Tous les fichiers listés sont versionés et ont été lus en entier
- Aucun fichier caché, aucun code généré, aucune boîte noire
- `git log` : un seul commit : `init: pilote de test SHIFT/Paperclip`
