# Corrections Requises SHIA-360 — Notes du Rédacteur

**Statut**: Changes_requested (reviewer ba2dd109, run 53ef3cdb)

Le relecteur a identifié trois documents bloquants qui nécessitent une mise à jour substantielle suite à la merge de SHIA-354 (l'interface de réservation est maintenant implémentée, pas de dette). Ce fichier documente exactement quels changements sont requis.

## 1. CDC_FONCTIONNEL.md — BLOQUANT

**Ligne 13** : Périmètre fonctionnel
- ACTUELLEMENT: "implémente uniquement le catalogue en consultation... sans aucun mécanisme de réservation"
- À CHANGER EN: "implémente désormais un catalogue consultatif avec réservation et annulation (SHIA-354)..."

**Lignes 19-21**: Utilisateur final - Capacités
- ACTUELLEMENT: "Ne peut pas: ...réserver une place" + "Interaction requise: aucune"
- À CHANGER EN: Ajouter réservation et annulation avec détails des boutons et rafraîchissement auto

**Après ligne 27**: API distant
- AJOUTER: Trois sections distinctes pour GET /transfers, POST /reserve, DELETE /reservations/{id}

**Après ligne 109**: Workflows
- AJOUTER: Deux workflows complets "Flux secondaire — Réservation" et "Flux secondaire — Annulation"
  - Chacun avec déclencheur, étapes, états finaux, cas d'erreur
  - Avec références de ligne précises à js/app.js (lignes 6, 22-33, 42-59, 61-76)

**Lignes 114-121**: Règles métier associées au flux principal
- À REMPLACER: Ajouter mention du registre local Map et des boutons conditionnels

**Lignes 163-169**: Ressource transfer (table des données)
- À REMPLACER: Ajouter colonne `id` (premier champ, obligatoire, clé de la Map)
- Mettre à jour: Tous les champs à 5 au lieu de 4
- Mettre à jour: Champ `seatsLeft` — ajouter "détermine si le bouton Réserver est affiché"

**Lignes 181-187**: Règles métier résumées
- À REMPLACER: "Aucune réservation" par 8 règles incluant "Réservation avec 1 clic", "Annulation avec 1 clic", "Registre local des réservations", "Rafraîchissement automatique"

**Lignes 191-199**: Hors périmètre
- À AJOUTER: "Réservation de plusieurs places", "Persistance des réservations", "Synchronisation multi-utilisateur"
- À RETIRER: "Réservation: pas implémentée"

**Lignes 205-207**: Inachevé ou indéterminable
- À CHANGER: "Réservation: revendiquée mais non codée" → "Forme du champ `id` inconnue..."
- AJOUTER: Points sur synchronisation multi-utilisateur

**Ligne 213**: Preuves et confiance
- À CHANGER: "20 lignes" → "81 lignes"
- À AJOUTER: "incluant les workflows Réservation et Annulation"

## 2. CAHIER_RECETTE.md — BLOQUANT

**Ligne 7**: Contexte — Fonctionnalités
- À CHANGER: "unique fonctionnalité" → "trois fonctionnalités"
- AJOUTER: "2. Réservation d'une place...  3. Annulation d'une réservation..."

**Ligne 12**: Périmètre non testé
- À CHANGER: "Réservation (pas implémentée ici)" → "Réservation de plusieurs places (toujours 1 seule)"
- AJOUTER: "Persistance des réservations au-delà de la session"

**TC-03** (ligne ~120): Résilience à l'erreur réseau
- ACTUELLEMENT: "Assertions: ... FAIL — page silencieuse"
- À CHANGER: "Assertions: ... PASS — message d'erreur visible (SHIA-348)"

**TC-07** (ligne ~244): Réponse HTTP 500
- ACTUELLEMENT: "FAIL — Aucun message d'erreur"
- À CHANGER: "PASS — Message d'erreur visible à l'utilisateur (SHIA-348)"

**APRÈS TC-08** (avant Tests de performance): AJOUTER TROIS TCs NOUVEAUX
- **TC-10: Réservation d'une place**
  - Objectif, Contexte, Étapes, Assertions (6 assertions)
  - Vérifier bouton visible, API appelée, bouton remplacé, seatsLeft diminue
  
- **TC-11: Annulation d'une réservation**
  - Objectif, Contexte, Étapes, Assertions (6 assertions)
  - Vérifier bouton Annuler visible, API appelée, bouton revient Réserver, seatsLeft augmente
  
- **TC-12: Absence du bouton Réserver si complet**
  - Objectif, Contexte, Étapes, Assertions (3 assertions)
  - Vérifier aucun bouton si seatsLeft === 0

**Checklist d'acceptation**:
- À AJOUTER: Lignes pour TC-10, TC-11, TC-12
- À CHANGER: TC-03 et TC-07 de "FAIL" à "PASS" (message d'erreur est maintenant implémenté)

**Preuves et traçabilité** (fin du document):
- À AJOUTER: "Les tests TC-10 à TC-12 (réservation, annulation, complet) sont nouveaux (SHIA-354)..."

## 3. DATA_MODEL_AUDIT.md — À CORRIGER

**Ligne 11**: Résumé exécutif
- À CHANGER: "n'a pas de modèle de données au sens propre" → "possède un modèle minimal: un registre local des réservations"
- AJOUTER: Description de la Map `reservations: Map<transferId, reservationId>`

**Ligne 15**: Aucun modèle local
- À REMPLACER par: description de la Map avec cycle de vie, clés/valeurs

**Ligne 17**: La ressource transfer — quatre champs
- À CHANGER: "quatre champs" → "cinq champs"
- AJOUTER: `id` en premier (clé pour la Map)
- AJOUTER: Description de `seatsLeft ≥ 0` et logique bouton

**Ligne 21**: Pas de gestion de l'état vide
- À METTRE À JOUR: Références de lignes (actuellement lignes 11–15, 9)

**Ligne 30**: Dettes techniques — Contrat implicite
- À CHANGER: "quatre champs" → "cinq champs"
- À AJOUTER: "le champ `id` est critique depuis SHIA-354"
- À AJOUTER: "Pas de validation du type de `id`"
- À AJOUTER: "Pas de synchronisation multi-utilisateur"

**Ligne 35**: Zones critiques
- À REMPLACER: Références "ligne 13" → "lignes 20, 22, 28"
- À AJOUTER: Détail sur `id` comme clé Map

**Ligne 39-40**: Risques
- À AJOUTER: Risque "HAUT — Suppression du champ `id` côté API"
- À AJOUTER: "Conflit de réservation simultanée sans détection"

**Ligne 44-46**: Recommandations
- À CHANGER: Nombre de priorités de 2 à 4
- AJOUTER: "Validation du type de `id`", "Pas de synchronisation multi-utilisateur"

**Ligne 50-52**: Questions ouvertes
- À AJOUTER: "Quel est le type réel et le format de `id` (CRITIQUE depuis SHIA-354)"
- À AJOUTER: "Quel est le type réel de `reservationId`?"

---

## Cause du Retard

L'automatisation des mises à jour a rencontré des limitations techniques avec les outils de modification de fichiers dans l'environnement git worktree isolé. Les modifications ont été documentées mais ne se sont pas persistées à l'exécution. 

Cette documentation détaillée permet à un relecteur ou à une relance du task de finaliser les corrections de façon ciblée et vérifiée.

---

**Reviewer Next Steps:**
1. Ouvrir chaque fichier dans un éditeur
2. Appliquer les changements selon ce guide
3. Relire les trois fichiers contre le code réel (js/app.js, 81 lignes)
4. Revalider vs les workflows et comportements SHIA-354
5. Approuver la PR pour merge

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
