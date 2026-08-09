# Relecture — FUNCTIONAL_AUDIT.md

> Mise à jour SHIA-572. La version précédente de cette relecture portait sur un front sans réservation (grep `reserv` → 0 résultat). Elle est intégralement remplacée par la relecture de l'audit réconcilié.

## Verdict global

**Bon** — L'audit réconcilié est exploitable sans réserve bloquante. Les corrections demandées (limiter « fonctionnalités complètes » à « implémentées dans le front », conditionner les risques de réconciliation et de perte de contexte au contrat API) ont été appliquées. Les constats structurels directs restent `VÉRIFIÉ_CODE` avec citations exactes.

## Corrections appliquées (SHIA-572, passage 2)

- **Compréhension globale et résumé** : « trois fonctionnalités complètes » remplacé par « trois fonctionnalités implémentées dans le front ». La qualification de testées est précisée : « en isolation (fonctions appelées directement sans navigateur réel ni API réelle) ».
- **Gestion d'erreur visible** : caveat ajouté — la visibilité de l'erreur est conditionnelle à la présence du nœud DOM `#transfers-list`.
- **Risque de réconciliation session** : requalifié de `VÉRIFIÉ_CODE` à `HYPOTHÈSE`, conditionné explicitement au contrat API (non observable depuis ce dépôt).
- **Risque de perte de contexte après erreur secondaire** : le côté front reste `VÉRIFIÉ_CODE` ; le fait que la réservation ait eu lieu côté API est qualifié `HYPOTHÈSE`.

## Points vérifiés et corrects

**1. Fonctionnalité 1 — affichage du catalogue — `VÉRIFIÉ_CODE` exact.**
`DOMContentLoaded` → `loadTransfers()` (ligne 89). `GET /transfers`, itération, `<li>` par transfert (`js/app.js:22`). ✓

**2. Fonctionnalité 2 — réservation — `VÉRIFIÉ_CODE` exact.**
Bouton Réserver si `seatsLeft > 0` et pas de réservation active (lignes 30–34). `reserve()` : garde (ligne 45), POST (lignes 49–53), stockage `reservationId` (ligne 58), rafraîchissement (ligne 59). ✓

**3. Fonctionnalité 3 — annulation — `VÉRIFIÉ_CODE` exact.**
Bouton Annuler si réservation active (lignes 25–29). `cancelReservation()` : garde (ligne 68), DELETE (lignes 72–75), suppression (ligne 79), rafraîchissement (ligne 80). ✓

**4. Verrou anti double-clic — `VÉRIFIÉ_CODE` exact.**
`reservations.has || pendingTransfers.has` (ligne 45) et `pendingTransfers.has` (ligne 68). Trois tests dans `js/app.test.js` (lignes 249–310). ✓

**5. Gestion d'erreur visible — conditionnelle à la présence du DOM.**
`list.textContent` dans les trois `catch` (lignes 40, 61, 82). Correctement conditionné à la présence du nœud. ✓

**6. Lacunes correctement identifiées — `VÉRIFIÉ_CODE` exact.**
Pas d'indicateur de chargement, pas de message liste vide, réservations session-locales. ✓

**7. Risques correctement qualifiés.**
- Réconciliation après rechargement : `HYPOTHÈSE` — conditionnel au contrat API. ✓
- Conflit simultané : `HYPOTHÈSE` (inchangé). ✓
- Perte de contexte post-reserve : côté front `VÉRIFIÉ_CODE`, côté API `HYPOTHÈSE`. ✓

**8. Aucun secret recopié.** ✓

## Recommandations de correction

Aucune correction requise.
