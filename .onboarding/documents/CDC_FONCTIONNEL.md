# CDC FONCTIONNEL — shift-pilot-resa-web

> **Confiance : medium.** Tout le code côté front est lu ; la forme réelle de l'API distante reste `INCONNU` ici.

## Contexte métier

**Qui** : voyageurs (utilisateurs finaux) en Polynésie française  
**Quoi** : consulter les **transferts inter-îles** disponibles — tarif et places libres  
**Où** : interface web (`index.html`) consommant une API distante  
**Contrainte** : aucune réservation possible depuis ce front (code non implémenté ici, probablement côté API)

L'interface affiche un catalogue en lecture seule : ligne par ligne, chaque transfert montre son origine, destination, prix en XPF et nombre de places. L'utilisateur ne peut que regarder ; toute action (réserver, filtrer, trier) est absente.

## Acteurs

### Utilisateur final
- **Capacités** : charger la page, lire la liste affichée
- **Interdictions** : ne peut rien sélectionner, filtrer, modifier, réserver
- **Accès** : aucune authentification requise (API publique)

### Système (navigateur + API)
- **Capacités** : charger le HTML, exécuter le JavaScript, émettre un appel HTTP, parser et afficher du JSON
- **Interdictions** : aucune persistance locale, aucune écriture vers l'API

## Parcours critique : affichage des transferts

### Situation de départ
L'utilisateur ouvre la page `index.html` dans son navigateur.

### Déclencheur
Chargement du DOM (`DOMContentLoaded`).

### Déroulement (séquence détaillée)

#### 1. Résolution de l'endpoint API
`js/app.js:2-3` : `API_BASE_URL = window.API_BASE_URL || "http://localhost:3100"`

**Règle métier** : priorité à l'injection externe.
- Si la page hôte définit `window.API_BASE_URL` (ex. en production), cette valeur est utilisée
- Sinon, fallback à `"http://localhost:3100"` pour le développement local
- Aucune validation de format ni de joignabilité à ce stade

**Données** : `API_BASE_URL` devient une constante pour la page ; sa modification post-chargement n'a aucun effet sans rechargement.

#### 2. Appel à `/transfers`
`js/app.js:6` : `fetch(\`${API_BASE_URL}/transfers\`)`

**Règle métier** : requête GET publique, sans authentification.
- Méthode : GET
- En-têtes : aucun en-tête personnalisé (`Authorization`, `Cookie`, `X-API-Key`)
- Timeout : non configuré (dépend du navigateur)
- Format attendu : JSON tableau (confirmé par le `for...of` à la ligne 11)

**Résultat attendu** : tableau d'objets `transfer`, chacun contenant au minimum :
- `from` : chaîne — origine (nom d'île)
- `to` : chaîne — destination (nom d'île)
- `price` : nombre — prix en XPF
- `availableSeats` : entier — places libres

**Incertitude** : l'API renvoie-t-elle d'autres champs (id, horaires, compagnie) ? La réponse vit dans `shift-pilot-resa-api`.

#### 3. Désérialisation JSON
`js/app.js:7` : `const transfers = await response.json()`

**Règle métier** : interprétation brute du corps de réponse comme JSON.
- Aucune vérification du statut HTTP (`response.ok` non contrôlé)
- Aucune vérification du type (n'importe quel JSON valide est accepté)
- Si la réponse est un objet `{ error: "..." }` ou une chaîne, le parse réussit mais l'affichage échoue plus loin

#### 4. Rendu de la liste
`js/app.js:10-15` : itération et affichage

**Étapes** :
1. Vider la liste HTML : `list.innerHTML = ""`
2. Pour chaque objet `t` du tableau `transfers` :
   - Créer un `<li>` avec le texte : `${t.from} → ${t.to} — ${t.price} XPF (${t.availableSeats} places)`
   - Ajouter à `<ul id="transfers-list">`

**Règles métier** :
- Format d'affichage fixe : toujours `origine → destination — prix XPF (N places)`
- Unité de prix : XPF codée en dur, aucune conversion
- Ordre : tel que renvoyé par l'API (pas de tri client)
- Pas d'état de chargement : l'utilisateur voit une liste vide jusqu'à la fin du fetch, sans indication
- Pas de message si la liste est effectivement vide (0 transferts disponibles)

#### 5. Fin du processus
La liste est affichée et restituée à l'utilisateur.

### Résultat attendu
Page affichant :
```
Transferts

- Tahiti → Moorea — 5000 XPF (12 places)
- Moorea → Bora Bora — 8500 XPF (5 places)
- Tahiti → Huahine — 6200 XPF (0 places)
```

(ou tout autre contenu renvoyé par l'API)

### Scénarios de défaillance

#### API injoignable (réseau, DNS, CORS)
**Comportement actuel** : `fetch()` rejette la promesse → exception non interceptée → page affiche liste vide, message d'erreur dans la console uniquement.  
**Impact utilisateur** : confusion (est-ce que la liste est vide ? ou l'API est down ?)  
**Sévérité** : haute (affect directement la principale fonction)

#### Réponse HTTP 4xx/5xx avec JSON valide
**Exemple** : `500 Internal Server Error` + corps `{ error: "..." }`  
**Comportement actuel** : le JSON est parsé comme valide, l'objet erreur est traité comme s'il était un tableau → `for...of` lève `TypeError` non interceptée.  
**Impact utilisateur** : identique au cas précédent (page vide silencieuse).

#### Réponse non-tableau
**Exemple** : API renvoie `{ data: [...] }` au lieu de `[...]`  
**Comportement actuel** : `for...of` lève `TypeError`.  
**Impact utilisateur** : identique.

#### Champs manquants
**Exemple** : un transfert n'a pas la clé `availableSeats`  
**Comportement actuel** : `t.availableSeats` est `undefined` → affichage : `Tahiti → Moorea — 5000 XPF (undefined places)`.  
**Impact utilisateur** : interface illisible sur la ligne concernée.

#### Transfert avec 0 places
**Exemple** : `availableSeats: 0`  
**Comportement actuel** : affichage : `... — ... XPF (0 places)`.  
**Règle métier** : aucune distinction visuelle (pas de mention « Complet », pas de style particulier).  
**Incertitude** : faut-il exclure ces transferts de l'affichage si la réservation est un jour implémentée ?

## Règles métier

### Configuration de l'endpoint
- L'URL de base est injectable via `window.API_BASE_URL` pour supporter plusieurs environnements (dev, staging, prod)
- Sans injection, le fallback localhost est utilisé
- L'URL est résolue une seule fois au chargement du script ; tout changement post-chargement n'a aucun effet

### Affichage des transferts
- Toujours au format `from → to — price XPF (seats places)`, littéralement
- XPF est l'unité de monnaie unique, codée en dur (pas de conversion multidevise)
- Les transferts sont affichés dans l'ordre renvoyé par l'API (pas de tri, de filtre ni de groupement client)
- Un transfert avec 0 place est affiché sans distinction particulière

### Absence de persistance
- Aucune donnée n'est stockée localement (`localStorage`, `sessionStorage`, cookie)
- Aucune écriture n'est envoyée vers l'API (`fetch` en GET seul)
- Toute mise à jour des données requiert un rechargement de page

### Absence de réservation (dans ce workspace)
- Aucun formulaire, aucun bouton, aucun appel POST
- Texte du `README.md` : *« interface de réservation »* — à clarifier si cette fonctionnalité est prévue ou un décalage documentaire

## Données — vue métier

### Ressource `transfer` (du point de vue du front)
```
{
  from: string          // ex. "Tahiti"
  to: string            // ex. "Moorea"
  price: number         // ex. 5000 (unité XPF, pas de décimales attendues)
  availableSeats: int   // ex. 12 (peut être 0 si transfert complet)
  // Autres champs possibles : id, departureTime, carrier, etc. — INCONNU ici
}
```

**Contraintes** :
- Tous les quatre champs sont supposés présents (aucune validation si absents)
- Types exacts `INCONNU` pour `price` (entier ou flottant ?)
- Forme complète de la réponse `INCONNU` (y a-t-il une pagination, une enveloppe, un identifiant ?)

### Liste de transferts
Tableau de 0 ou plus objets `transfer` renvoyés par `GET /transfers`.

## Délimitation honnête

### Ce que ce workspace fait
- Charge un HTML statique
- Exécute un script qui appelle une API et affiche le résultat
- Permet de **consulter** une liste de transferts

### Ce que ce workspace ne fait pas
- Réserver un transfert (aucun code POST, ni formulaire)
- Filtrer, trier ou paginer (aucune logique de tri côté client)
- Authentifier (pas de session, pas de token, pas de login)
- Valider les données reçues
- Gérer les erreurs réseau ou malformées
- Persister de l'état localement

### Ce qui manque pour en faire une application complète
1. Gestion d'erreur et feedback utilisateur (états de chargement, messages d'erreur)
2. Contrat API explicite (schéma, types, validation)
3. Tests automatisés
4. Infrastructure de déploiement
5. Fonctionnalité de réservation (si elle doit venir du front)
6. Formatage des données (prix localisé, horaires, etc.)

## Questions ouvertes

- **Réservation** : prévue dans ce front ou uniquement API ?
- **Forme de `/transfers`** : quels champs exactement ? Pagination ?
- **Authentification** : l'API requiert-elle une clé, un jeton ?
- **Déploiement** : comment `window.API_BASE_URL` est injectée en production ?
- **Actualisation** : faut-il un bouton refresh ou une actualisation périodique ?
- **Disponibilités à 0** : exclure ou afficher « Complet » ?

## Preuves

- `WORKFLOW_AFFICHER_TRANSFERTS.md` — flux détaillé ligne par ligne (`js/app.js:5-16`, `index.html:8-9`)
- `WORKFLOW_CONFIGURATION_ENDPOINT.md` — mécanisme d'injection d'endpoint (`js/app.js:2-3`)
- `FUNCTIONAL_AUDIT.md` — analyse de ce qui existe et de ce qui manque
- `DATA_MODEL_AUDIT.md` — contrat API et validation (absences identifiées)
- `SECURITY_ROBUSTNESS_AUDIT.md` — gestion d'erreur et robustesse (absences identifiées)
