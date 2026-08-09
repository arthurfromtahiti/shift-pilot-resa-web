# CARTOGRAPHIE_CODE — shift-pilot-resa-web

Structure technique, domaines → fichiers, points d'entrée critiques.

## Structure générale

```
shift-pilot-resa-web/
├── index.html              # Point d'entrée HTML
├── js/
│   ├── app.js             # Unique fichier de logique exécutable (90 lignes)
│   └── app.test.js        # Suite de 13 tests automatisés
├── README.md              # Documentation projet
└── .git                   # Historique de commits
```

**Taille** : 4 fichiers versionnés utiles (exécutable + tests). Aucune dépendance externe, aucun build, aucun framework. Historique : commits jusqu'à `acf9f61` incluant SHIA-354 (réservation/annulation), SHIA-383 (protection double-clic), SHIA-348 (gestion d'erreur).

## Domaines et fichiers

### Domaine 1 — Consultation et réservation de transferts (`consultation-transferts`)

**Catégorie** : métier (cœur du produit)  
**Priorité** : Critique  
**Fichiers**

| Fichier | Rôle | Lignes utiles | Criticité |
|---------|------|---|---|
| `js/app.js` | Fonctions d'affichage (`loadTransfers`), de réservation (`reserve`), d'annulation (`cancelReservation`), état (`reservations` Map + `pendingTransfers` Set) | 5–86 | **CRITIQUE** — toute la logique métier du produit |
| `index.html` | Conteneur de rendu `<ul id="transfers-list">` | 9 | Haute — point d'ancrage du DOM |

**Entrée** : événement `DOMContentLoaded` du navigateur, clics sur boutons « Réserver » / « Annuler »  
**Sortie** : liste HTML de transferts avec boutons d'action, état des réservations  
**Logique principale**
```javascript
// js/app.js, lignes 10–68 (loadTransfers)
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
- `reserve(transferId)` (lignes 44–65) : vérifie `reservations` et `pendingTransfers` (protection double-clic SHIA-383) avant d'agir, POST vers `/transfers/{transferId}/reserve`, met à jour `reservations` Map, rafraîchit la liste
- `cancelReservation(transferId, reservationId)` (lignes 67–86) : vérifie `pendingTransfers` avant d'agir, DELETE vers `/transfers/{transferId}/reservations/{reservationId}`, supprime de `reservations`, rafraîchit la liste

**Points d'attention**
- Gestion d'erreur avec `try/catch` et vérification `response.ok` présents (lignes 12–41)
- `pendingTransfers` (Set) verrouille chaque `transferId` pendant un appel réseau — protection anti double-clic (SHIA-383)
- États clients `reservations` (Map) et `pendingTransfers` (Set) ne sont pas persistés — oubliés au rechargement de page
- Pas de validation des champs `id`, `from`, `to`, `price`, `seatsLeft` — un absent → `undefined` affiché
- Contrat implicite avec l'API : champ `id` requis et unique pour chaque transfert ; détails du comportement serveur (décrément de `seatsLeft` lors d'une réservation, persistance) sont **INCONNU** depuis ce dépôt
- Affichage des erreurs remplace entièrement le contenu du conteneur `list` (invasif en cas de liste large)

**Hotspot n°1** du dépôt : le champ `id` de chaque transfert doit exister et être stable — son absence ou mutation casse la gestion des réservations.

### Domaine 2 — Intégration API (`integration-api`)

**Catégorie** : technique (support)  
**Priorité** : Soutien  
**Fichiers**

| Fichier | Rôle | Lignes | Criticité |
|---------|------|---|---|
| `js/app.js` | Configuration et appels réseau vers `shift-pilot-resa-api` | 2–3, 13, 49–53, 72–75 | Haute — point de couplage critique |

**Configuration d'URL**
```javascript
// js/app.js, lignes 2–3
const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) || "http://localhost:3100";
```

- **Mécanisme** : lecture de `window.API_BASE_URL` injectée par la page hôte, fallback vers `localhost:3100`
- **En développement** : fallback automatique vers `localhost:3100` — aucune configuration manuelle requise
- **En production** : nécessite une injection de `window.API_BASE_URL` par un mécanisme externe (non versionné dans ce dépôt — **INCONNU**, probablement côté serveur HTTP, CI/CD ou build)

**Appels réseau**
```javascript
// js/app.js, ligne 13 — GET /transfers
const response = await fetch(`${API_BASE_URL}/transfers`);

// js/app.js, lignes 49–53 — POST /transfers/{id}/reserve
const response = await fetch(`${API_BASE_URL}/transfers/${transferId}/reserve`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ seats: 1 }),
});

// js/app.js, lignes 72–75 — DELETE /transfers/{id}/reservations/{id}
const response = await fetch(
  `${API_BASE_URL}/transfers/${transferId}/reservations/${reservationId}`,
  { method: "DELETE" }
);
```

- **Endpoints consommés** :
  - `GET /transfers` : retourne tableau JSON de transferts. Champs observables (consommés par le frontend) : `id`, `from`, `to`, `price`, `seatsLeft`. D'autres champs peuvent être présents côté API mais ne sont pas consommés par ce frontend.
  - `POST /transfers/{transferId}/reserve` : réserve une place. Requête : body JSON `{ seats: 1 }`. Réponse attendue par le frontend : JSON contenant le champ `reservationId` (utilisé pour l'annulation). Contrat distant exact et comportement serveur (décrément de `seatsLeft`, validation de `seats >= 1`, persistance) : **INCONNU depuis ce dépôt** — voir documentation `shift-pilot-resa-api`.
  - `DELETE /transfers/{transferId}/reservations/{reservationId}` : annule une réservation. Réponse attendue par le frontend : statut 2xx (204 ou 200 avec corps vide). Comportement serveur (réaugmentation de `seatsLeft`) : **INCONNU depuis ce dépôt** — voir documentation `shift-pilot-resa-api`.
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

- **Persistance locale** : `Map` client (`reservations`) et `Set` client (`pendingTransfers`) pour l'état des réservations et des opérations en cours — aucun `localStorage`, `sessionStorage`, ou `indexedDB` (`grep` → 0). États perdus au rechargement.
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
**Événement déclencheur** : `DOMContentLoaded` (js/app.js, ligne 89)  
**Fonction déclenchée** : `loadTransfers()` (js/app.js, lignes 10–42)

### Secondaire — Rafraîchissement après action

La liste est automatiquement rafraîchie après chaque réservation ou annulation. Les fonctions `reserve()` (ligne 59) et `cancelReservation()` (ligne 80) appellent `loadTransfers()` à la suite de leur action API. Ce mécanisme de rappel n'est plus théorique : il est utilisé par les boutons d'action de la liste.

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

### Hotspot 1 — Couplage implicite avec le schéma API — champ `id` critique (`js/app.js`, lignes 24, 58, 79)

```javascript
const reservationId = reservations.get(t.id);  // ligne 24
reservations.set(transferId, data.reservationId);  // ligne 58
reservations.delete(transferId);  // ligne 79
```

**Risque** : le champ `id` de chaque transfert est utilisé comme clé pour stocker/récupérer les réservations. Son absence, mutation, ou instabilité casse complètement la gestion des réservations (mauvaise correspondance entre UI et état client).

**Priorité** : **CRITIQUE** — le champ `id` doit exister, être unique et stable pour chaque transfert.

### Hotspot 2 — Couplage implicite avec le schéma API — champs d'affichage (`js/app.js`, ligne 22)

```javascript
item.textContent = `${t.from} → ${t.to} — ${t.price} XPF (${t.seatsLeft} places)`;
```

**Risque** : un champ renommé ou absent côté API (`from`, `to`, `price`, `seatsLeft`) → `undefined` affiché sans erreur. Actuellement harmonisé suite au correctif SHIAAAAAAAAAAAAAAAAAAAAAAAA-311.

**Priorité** : **Moyenne** — fragile à l'évolution de l'API, mais actuellement en phase.

### Hotspot 3 — Gestion des erreurs invasive (`js/app.js`, lignes 39–41)

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

**Risque** : le mécanisme d'injection de `window.API_BASE_URL` en production n'est pas documenté ni versionné dans ce dépôt. En développement, le fallback `http://localhost:3100` fonctionne ; en production, l'injection doit être effectuée par un layer externe (serveur HTTP, CI/CD, script HTML) et n'est pas vérifiable depuis ce code.

**Priorité** : **Moyenne** — acceptable en pilote avec configuration locale ; critique en production si l'injection externe échoue silencieusement.

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
- `git log` : multiples commits et merges jusqu'à `acf9f61`, incluant SHIA-354 (réservation/annulation), SHIA-383 (protection double-clic), SHIA-348 (gestion d'erreur améliorée)
- Tests : 13 tests automatisés dans `js/app.test.js` validant les workflows (affichage, réservation, annulation, double-clic, erreurs)
