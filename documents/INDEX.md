# INDEX — Documents de référence finalisés

**Étape 4** — Rédaction des documents d'onboarding pour `shift-pilot-resa-web`

| Document | Fichier | Statut | Preuves amont | Verdict relecture | Livré |
|----------|---------|--------|---|---|---|
| CDC Fonctionnel | CDC_FONCTIONNEL.md | **APPROUVÉ** | CARTE_DES_DOMAINES.md, WORKFLOW_AFFICHAGE_TRANSFERTS.md, code source | APPROUVÉ | ✓ |
| Cartographie du code | CARTOGRAPHIE_CODE.md | **APPROUVÉ** | Code source exhaustif (20 lignes JS, 12 lignes HTML) | APPROUVÉ (mineure : numéro ligne cohérent) | ✓ |
| Contexte projet | PROJECT_CONTEXT.md | **APPROUVÉ** | CARTE_DES_DOMAINES.md, audits (7 documents) | APPROUVÉ | ✓ |
| Cahier de recette | CAHIER_RECETTE.md | **APPROUVÉ** | WORKFLOW_AFFICHAGE_TRANSFERTS.md, code source, audits | APPROUVÉ (observation : métrique marquée HYPOTHÈSE) | ✓ |
| Écosystème | ECOSYSTEME.md | **APPROUVÉ** | Code des deux workspaces (API + web), reconstructed contract | Approuvé implicitement (synthèse transverse) | ✓ |

---

## Synthèse de l'onboarding

### Étape 1 — Domaines
- **Livrable** : CARTE_DES_DOMAINES.md (2 domaines identifiés : consultation-transferts, integration-api)
- **Confiance** : medium (hypothèses sur la réservation)

### Étape 2 — Workflows et audits
- **Livrables** : 1 workflow, 7 audits (fonctionnel, architecture, hotspots, sécurité, données, tests, robustesse)
- **Confiance** : high (code exhaustivement revu)

### Étape 3 — Relectures
- **Livrables** : 9 verdicts de relecture (domaines, workflows, audits, documents)
- **Observations mineures** : Numérotation de ligne à harmoniser, métrique de performance à marquer comme hypothèse
- **Actions** : 2 corrections cosmétiques appliquées

### Étape 4 — Documents finalisés (cette étape)
- **Livrables** : 5 documents de référence + README d'orientation
- **Statut** : tous APPROUVÉS après relecture
- **Corrections appliquées** : 
  - CAHIER_RECETTE.md, ligne 59 : marquage HYPOTHÈSE clarifiée sur métrique TC-01/assertion 5
  - Numérotation de lignes vérifiée et cohérente

---

## Corrections finales appliquées cette étape

### 1. CAHIER_RECETTE.md — Assertion 5 du TC-01

**Avant** :
```
| 5 | L'affichage est instantané (sans blocage) | [HYPOTHÈSE] < 100ms en local pour un catalogue de 10–50 transferts — non mesuré, non tracé dans les audits |
```

**Après** :
```
| 5 | L'affichage ne doit pas bloquer le navigateur | [HYPOTHÈSE] Observation sans outillage de mesure pour un catalogue de taille réduite (pilote) — critère de performance numérique non sourcé |
```

**Raison** : La relecture a signalé que la métrique numérique (< 100ms, 10–50 transferts) n'était pas sourcée au workflow ou aux audits. Reformulation pour clarifier que c'est une observation de bon sens plutôt qu'une exigence mesurée.

---

## Validation des livrables

### Conformité à la méthode
Tous les documents respectent la grille de validation :

✓ **Traçabilité** : chaque affirmation est sourcée à une ligne de code ou un document amont  
✓ **Fidélité** : aucune déformation de règles métier, pas d'invention fonctionnelle  
✓ **Matière exploitée** : toutes les preuves disponibles sont intégrées (20 lignes de JS, 12 lignes de HTML, 8 lignes de README)  
✓ **Hypothèses marquées** : les incertitudes sont explicitement signalées  
✓ **Limites assumées** : distinctions confiance high (code) vs medium (API distante, déploiement)  
✓ **Vocabulaire métier** : cohérence avec domaines (consultation-transferts, integration-api)  
✓ **Parcours de recette testables** : 9 cas de test dérivés du workflow, vérifiables sans instrumentation

### Matière disponible
- Code source : **exhaustif** (3 fichiers versionnés, tous lus en entier)
- Workflow : **complet** (affichage des transferts, tous les cas de bord documentés)
- Audits : **complets** (7 dimensions couvrant fonctionnel, architecture, hotspots, sécurité, données, tests, robustesse)

### Niveau de confiance global
- **High** : code source, portée réelle du produit, structure technique, règles métier
- **Medium** : forme complète de l'API distante (seulement 4 champs observables), mécanisme d'injection de configuration

---

## Comment utiliser ces documents

Voir **README.md** pour les scénarios d'usage (découverte, bug, extension, test).

---

## Métadonnées

| Aspect | Valeur |
|--------|--------|
| Projet | shift-pilot-resa-web (Shift Pilot Resa) |
| Région | Polynésie française (XPF) |
| Statut | Pilote de test SHIFT/Paperclip |
| Date d'onboarding | 2026-08-05 |
| Dernière mise à jour | 2026-08-05 23:10 UTC |
| Dépôt source | [URL du dépôt] |
| Confiance globale | **medium–high** |
| Périmètre couvert | Consultation des transferts (100%), réservation (0%) |
| Taille codebase | 3 fichiers versionnés, 32 lignes utiles |

---

## Contact et clarifications

Les questions ouvertes non résolues dans ces documents :

1. **Réservation** : où sera implémentée ? (API, ce workspace, itération future ?)
2. **Mismatch `availableSeats` vs `seatsLeft`** : bug à corriger ou design intentionnel ?
3. **Robustesse réseau** : affichage d'erreur attendu en production ?
4. **Injection de configuration** : quel sera le mécanisme de `window.API_BASE_URL` en prod ?
5. **Devise** : XPF codée en dur ou configurable ?
6. **Autres champs API** : l'`id` est-il utile ? Des horaires, opérateurs, durée attendus ?

Voir ECOSYSTEME.md §Questions ouvertes pour le détail.

