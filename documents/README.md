# Documents de référence — shift-pilot-resa-web

Ce dossier contient les documents de référence produits lors de l'onboarding du projet **shift-pilot-resa-web** — un pilote de test SHIFT/Paperclip pour la Polynésie française.

## Fichiers et leur usage

### 1. **CDC_FONCTIONNEL.md** — Cahier des charges fonctionnel
Le document de référence métier. À lire pour comprendre :
- Ce que le produit fait réellement (affichage du catalogue de transferts)
- Ce que le produit **ne fait pas** (pas de réservation)
- Les parcours fonctionnels détaillés
- Les cas de bord et défaillances actuelles
- Les règles métier et données consommées

**Pour qui** : product managers, analystes métier, développeurs qui découvrent le projet.

---

### 2. **CARTOGRAPHIE_CODE.md** — Architecture technique et cartographie du code
Le document technique de référence. À lire pour :
- La structure des fichiers (`index.html`, `js/app.js`)
- Les deux domaines du produit et leurs fichiers correspondants
- Les points d'entrée et les flux de données
- Les hotspots (zones de risque) du code
- Les dépendances externes (API distante, injection de configuration)
- Les règles de maintenance

**Pour qui** : développeurs, architectes, toute personne maintenant ou modifiant le code.

---

### 3. **CAHIER_RECETTE.md** — Plan de test et critères d'acceptation
Le document de test. À lire pour :
- Les 9 cas de test (TC-01 à TC-09) couvrant le nominal et la robustesse
- Les assertions et critères d'acceptation détaillés
- L'environnement de test requis (prérequis, configurations)
- Les comportements actuels vs attendus
- La checklist d'acceptation finale

**Pour qui** : testeurs, développeurs qui valident leur travail, responsables de la release.

---

### 4. **PROJECT_CONTEXT.md** — Contexte projet et confiance
Le document d'orientation générale. À lire pour :
- La nature et le périmètre du projet (pilote de test)
- Les domaines clés et la technologie utilisée
- Les points d'attention et incertitudes (absence de réservation, robustesse)
- Le niveau de confiance associé à chaque aspect
- Les recommandations pour une mise en production

**Pour qui** : nouveaux membres de l'équipe, décideurs, stakeholders du projet.

---

### 5. **ECOSYSTEME.md** — Vue transverse des deux workspaces
Le document synthétique de l'écosystème complet. À lire pour :
- Comment le frontend (`shift-pilot-resa-web`) interagit avec l'API (`shift-pilot-resa-api`)
- Le contrat HTTP réel entre les deux systèmes
- Les mismatchs et tensions identifiés (ex. : `seatsLeft` vs `availableSeats`)
- Les flux transversaux et cassures observées
- Les questions ouvertes nécessitant une clarification

**Pour qui** : architectes solution, responsables de l'intégration, lead techniques.

---

## Comment utiliser ces documents

### Scénario 1 : Je découvre le projet
**Ordre de lecture recommandé** :
1. PROJECT_CONTEXT.md (5 min) — comprendre le contexte global
2. CDC_FONCTIONNEL.md (15 min) — découvrir ce que fait réellement le produit
3. CARTOGRAPHIE_CODE.md (15 min) — voir la structure technique
4. ECOSYSTEME.md (10 min) — comprendre l'intégration avec l'API

**Total estimé** : 45 minutes

### Scénario 2 : Je dois corriger un bug
**Ordre de lecture recommandé** :
1. CARTOGRAPHIE_CODE.md — localiser le hotspot et le fichier affecté
2. CDC_FONCTIONNEL.md §Cas de bord — comprendre le comportement attendu
3. CAHIER_RECETTE.md — identifier le test associé et valider la correction

### Scénario 3 : Je dois ajouter une fonctionnalité
**Points d'attention** :
1. Lire PROJECT_CONTEXT.md §Recommandations — attention aux points d'architecture
2. Consulter ECOSYSTEME.md §Questions ouvertes — vérifier les dépendances avec l'API
3. Mettre à jour CAHIER_RECETTE.md avec les nouveaux cas de test

### Scénario 4 : Je dois tester la release
**À suivre** : CAHIER_RECETTE.md — c'est le checklist complet d'acceptation

---

## Métadonnées

| Aspect | Valeur |
|--------|--------|
| **Projet** | shift-pilot-resa-web (Shift Pilot Resa) |
| **Région** | Polynésie française |
| **Statut** | Pilote de test |
| **Confiance globale** | medium–high |
| **Taille de codebase** | Très réduit (3 fichiers, 20 lignes de JS exécutable) |
| **Date de documentation** | 2026-08-05 |
| **Couverture** | Tous les fichiers versionnés ont été lus exhaustivement |

---

## Questions fréquentes

**Q: Où se trouve le code de réservation ?**  
A: Nulle part dans ce workspace. Le `README.md` l'annonce, mais ce n'est pas implémenté ici. C'est un point d'incertitude documenté — clarification requise.

**Q: Comment configurer l'URL de l'API en production ?**  
A: Injecter la variable `window.API_BASE_URL` avant que le script `js/app.js` s'exécute. Le mécanisme d'injection n'est pas versionné — probablement côté serveur ou build.

**Q: Le mismatch `availableSeats` vs `seatsLeft` est-il un bug ?**  
A: Oui. L'API retourne `seatsLeft`, mais le front essaie d'accéder `availableSeats`, ce qui produit `undefined`. Voir ECOSYSTEME.md §Cassures observées.

**Q: Quels tests automatisés existent ?**  
A: Aucun. Aucun fichier de test n'existe dans ce dépôt. Tous les tests sont manuels. Voir CAHIER_RECETTE.md.

---

## Preuves et validation

Tous les documents sont issus de lectures exhaustives du code source et ont été relus par une instance indépendante. Voir `.onboarding/relectures/` pour les verdicts de relecture détaillés.

**Niveau de confiance des assertions** : 
- `VÉRIFIÉ_CODE` : Affirmation sourcée directement dans le code source
- `HYPOTHÈSE` : Hypothèse raisonnée basée sur le contexte, non codée
- `INCONNU` : Information non observable depuis ce workspace (ex. : forme complète de l'API distante)

