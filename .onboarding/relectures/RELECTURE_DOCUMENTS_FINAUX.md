# RELECTURE — Documents finaux shift-pilot-resa-web

> **Relecteur** : ba2dd109-fb53-4d75-ab9e-b8824aa4ba32 (Relecteur de documents)  
> **Documents relus** : CDC_FONCTIONNEL.md, CARTOGRAPHIE_CODE.md, PROJECT_CONTEXT.md, CAHIER_RECETTE.md  
> **Matériau amont contrôlé** : CARTE_DES_DOMAINES.md, WORKFLOW_AFFICHAGE_TRANSFERTS.md, code source (`js/app.js`, `index.html`)  
> **Verdict global** : **APPROUVÉ avec observations mineures**

---

## Méthode

Contrôle effectué selon la grille `relire-documents` :

1. Traçabilité de chaque affirmation à l'amont
2. Fidélité des règles métier (pas de déformation)
3. Matière exploitée (document non creux)
4. Hypothèses marquées
5. Limites assumées
6. Vocabulaire métier
7. Parcours de recette testables

Le code source réel (`js/app.js`, 20 lignes ; `index.html`, 12 lignes) a été relu en entier pour valider les citations de lignes.

---

## CDC_FONCTIONNEL.md

### Traçabilité — CONFORME

Chaque règle et chaque étape de flux sont tracées à une ligne de code précise ou au matériau amont :

| Affirmation | Preuve amont |
|-------------|-------------|
| "Polynésie française, XPF" | CARTE_DES_DOMAINES.md §Nature du projet |
| "4 champs `from`, `to`, `price`, `availableSeats`" | `js/app.js` ligne 13 (`VÉRIFIÉ_CODE`) |
| "Aucun mécanisme de réservation (ni formulaire, ni panier, ni appel POST/PUT)" | CARTE_DES_DOMAINES.md §Incertitudes + grep confirme 0 résultat |
| URL fallback `http://localhost:3100` | `js/app.js` lignes 2–3 (`VÉRIFIÉ_CODE`) |
| `list.innerHTML = ""` avant rendu | `js/app.js` ligne 10 (`VÉRIFIÉ_CODE`) |
| Tous les cas de bord (erreur réseau, 4xx/5xx, tableau vide, champ absent) | WORKFLOW_AFFICHAGE_TRANSFERTS.md §Risques |

### Hypothèses marquées — CONFORME

- "Assumption : tous les prix de l'API sont en XPF" → marqué `Assumption`
- "probablement d'autres champs non utilisés par ce front" → prudence explicite
- "Clarification attendue" sur la réservation → marqué

### Observation non bloquante — Séquence de chargement

L'étape 1 du flux principal décrit : *"le titre `<h1>Transferts</h1>` et le conteneur `<ul id="transfers-list">` (vides) sont rendus. Le script `js/app.js` est chargé."*

La réalité exacte : le `<script src="js/app.js">` est à la ligne 10 de `index.html`, **après** `<ul>` (ligne 9). Le navigateur parse `<h1>` (ligne 8), `<ul>` (ligne 9), **puis rencontre** `<script>` (ligne 10) : le chargement et l'exécution du script sont déclenchés à ce moment, **avant** la fin du parse du document. Le terme "rendus" implique un rendu visuel qui n'a pas encore eu lieu à ce stade.

Cette simplification ne fausse pas la logique fonctionnelle (DOMContentLoaded ne se déclenche qu'après la fin du parse, et l'élément `<ul>` existe bien quand le script est exécuté). **Non bloquant** pour les lecteurs fonctionnels.

### Verdict CDC — APPROUVÉ

---

## CARTOGRAPHIE_CODE.md

### Traçabilité — CONFORME

Structure, hotspots, chemins de données, règles de maintenance : tout est tracé au code source.

### Observation mineure — Numérotation de lignes inconsistante

Dans le tableau du Domaine 1 (ligne 28 du document) :
> `Lignes utiles : 5–15`

Mais dans le texte Route/Entrée et dans le code block qui suit :
> `js/app.js, lignes 5–16`

Et dans la section Points d'entrée, ligne 135 :
> `loadTransfers()` (js/app.js, lignes **5–16**)

`loadTransfers()` dans le code réel se ferme à la ligne 16 (accolade fermante). La table dit `5–15`, le reste du document dit `5–16`. **Inconsistance interne mineure**, non bloquante.

### Sécurité — Vérification indépendante

L'affirmation "XSS : Utilisé `textContent` (pas `innerHTML`)" est vérifiée : `js/app.js` ligne 13 utilise effectivement `item.textContent`. ✓

### Verdict CARTOGRAPHIE_CODE — APPROUVÉ (corriger la table : `5–15` → `5–16`)

---

## PROJECT_CONTEXT.md

### Traçabilité — CONFORME

Document synthétique ancré sur la CARTE_DES_DOMAINES.md et les audits listés en §Preuves et confiance. Tous les constats sont issus des documents référencés. Aucune invention.

### Hypothèses marquées — CONFORME

"vraisemblablement dans `shift-pilot-resa-api`", "probablement côté serveur ou build" → toutes les conjectures sont signalées.

### Limites assumées — CONFORME

La distinction "confiance high (code) / confiance medium (API distante, déploiement)" est explicite et précise.

### Verdict PROJECT_CONTEXT — APPROUVÉ

---

## CAHIER_RECETTE.md

### Traçabilité au workflow — CONFORME

Les 8 tests (TC-01 à TC-08) sont tous dérivés du WORKFLOW_AFFICHAGE_TRANSFERTS.md §Risques et §Données, et du code source :

| Test | Preuve amont |
|------|-------------|
| TC-01 (nominal) | WORKFLOW §Étapes 3–6, code `js/app.js` lignes 5–16 |
| TC-02 (formatage) | `js/app.js` ligne 13, WORKFLOW §Règles métier |
| TC-03 (erreur réseau) | WORKFLOW §Risques : "fetch() sans try/catch" |
| TC-04 (liste vide) | WORKFLOW §Questions ouvertes |
| TC-05 (champ manquant) | WORKFLOW §Risques : "champs `undefined` silencieux" |
| TC-06 (staging) | CARTOGRAPHIE §Hotspot 3, CDC §Données/Configuration |
| TC-07 (HTTP 500) | WORKFLOW §Risques : "réponse 4xx/5xx non gérée" |
| TC-08 (format inattendu) | WORKFLOW §Risques : "réponse non-tableau" |

### Comportements attendus — VÉRIFIÉS contre le code

- TC-03 : "page affiche `<ul>` vide sans message" → exact (pas de try/catch dans le code) ✓
- TC-05 : "affiche `Tahiti → Moorea — 5000 XPF (undefined places)`" → exact (`item.textContent` avec `t.availableSeats` undefined) ✓
- TC-08 : "TypeError non capturée" → exact (`for (const t of transfers)` sur non-itérable) ✓

### Observation — Métrique de performance non sourcée

**TC-01, assertion #5** : *"< 100ms en local pour un catalogue de 10–50 transferts"*

Ce critère (seuil 100ms, fourchette 10–50 transferts) n'est tracé à aucun document amont : ni le WORKFLOW, ni les audits, ni la CARTE n'établissent de volumétrie ni de SLA de performance. Ce chiffre est une estimation du rédacteur.

**Recommandation** : marquer `HYPOTHÈSE` ou supprimer le critère numérique précis. Formuler à la place : *"L'affichage ne doit pas bloquer le navigateur — observable sans outillage de mesure pour un catalogue de taille réduite (pilote)"*.

**Non bloquant** : cette métrique est dans un test de bon sens et ne constitue pas une invention fonctionnelle.

### Exemples de données — Acceptables

Les valeurs "Tahiti → Moorea — 5000 XPF (12 places)" sont clairement des exemples illustratifs, non des données réelles. Leur usage pédagogique est correct.

### Verdict CAHIER_RECETTE — APPROUVÉ (observer la métrique TC-01/assertion 5)

---

## Verdict global

| Document | Verdict | Action requise |
|----------|---------|----------------|
| CDC_FONCTIONNEL.md | **APPROUVÉ** | Aucune (observation sur séquence chargement : non bloquant) |
| CARTOGRAPHIE_CODE.md | **APPROUVÉ** | Corriger table Domaine 1 : `5–15` → `5–16` |
| PROJECT_CONTEXT.md | **APPROUVÉ** | Aucune |
| CAHIER_RECETTE.md | **APPROUVÉ** | Marquer `HYPOTHÈSE` sur métrique TC-01/assertion 5 |

**Aucune invention fonctionnelle détectée.** Aucune règle métier ni fonctionnalité n'a été extrapolée au-delà du code et du matériau amont. Les affirmations incertaines sont systématiquement marquées. La matière disponible (pauvre mais exhaustivement lue) est bien exploitée.

Les deux corrections (numérotation de ligne, marquage hypothèse) sont cosmétiquest et n'impactent pas la fiabilité des documents. Le corpus est **apte à servir de référence pour l'onboarding**.
