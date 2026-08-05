# PROJECT_CONTEXT — shift-pilot-resa-web

> **Statut** : pilote de test  
> **Confiance globale** : medium–high  
> **Taille de codebase** : très réduit (3 fichiers versionnés, 20 lignes de JS exécutable)

## Nature et périmètre

`shift-pilot-resa-web` est une **interface web de consultation de transferts inter-îles** en Polynésie française. Le dépôt, déclaré comme un pilote de test SHIFT/Paperclip, fournit une page HTML statique qui affiche une liste de transferts en temps réel en interrogeant une API distante (`shift-pilot-resa-api`, dépôt séparé du même projet).

**Ce que fait le produit** : afficher au chargement de la page une liste des transferts disponibles (origine, destination, prix en XPF, places disponibles).

**Ce que ne fait pas le produit** : bien que le `README.md` mentionne une « interface de réservation », **aucun code de réservation n'existe dans ce dépôt**. La logique de réservation, s'il est prévu qu'elle existe, vit ailleurs (vraisemblablement dans `shift-pilot-resa-api`).

## Domaines clés

Deux domaines opérationnels, tous deux de confiance documentée :

1. **Consultation des transferts** (cœur du produit)  
   Récupère et affiche la liste des transferts inter-îles depuis l'API. C'est la **seule fonctionnalité réalisée** de ce workspace — si elle n'existait pas, la page n'aurait pas de raison d'être. Implémentation exhaustive dans `js/app.js` (15 lignes) et `index.html` (4 lignes utiles).

2. **Intégration API** (support technique)  
   Couche technique qui relie le front à `shift-pilot-resa-api` via configuration de l'URL de base (`window.API_BASE_URL`) et appel HTTP GET. Confiance haute : ce point de couplage est clairement identifié et stable.

## Contexte client

- **Région** : Polynésie française (devise XPF, liaisons inter-îles)
- **Cas d'usage** : consultation de catalogue sans interaction utilisateur — l'affichage est automatique au chargement de la page
- **Public** : voyageurs cherchant à connaître les transferts disponibles et leurs tarifs

## Points d'attention

### Écarts et incertitudes

1. **Absence de réservation malgré l'annonce**  
   Le `README.md` revendique une « interface de réservation » ; le code ne contient que de la consultation en lecture seule. Cet écart est entièrement assumé (voir CARTE_DES_DOMAINES.md) — c'est la portée d'un pilote, pas un bug. Reste à clarifier : la réservation sera-t-elle ajoutée côté front ou reste-t-elle côté API ?

2. **Robustesse en l'état de pilote**  
   Aucun état d'erreur visible à l'utilisateur : si l'API échoue, la page affiche une liste vide sans message. Ce choix est acceptable pour un pilote de test ; il deviendrait critique en production.

3. **Configuration d'URL non documentée**  
   L'URL de l'API est injectée via `window.API_BASE_URL`. Le mécanisme d'injection en production n'est pas versionné dans ce dépôt (probablement côté serveur ou build) — cela crée une dépendance tacite en dehors du périmètre versionnés.

### Dépendances

- **`shift-pilot-resa-api`** (API distante, endpoint `/transfers`)  
  Forme réelle du transfert (au-delà des quatre champs affichés) non observable depuis ce dépôt. Contrat implicite avec la structure retournée.

## Architecture et technologie

- **Stack** : HTML5 + JavaScript natif (zéro dépendance, zéro build, zéro framework)
- **Modèle de données** : aucun (front sans état, pas de persistance locale)
- **Structure** : une page unique, une fonction de chargement, un appel API
- **Déploiement** : fichiers statiques (HTML, JS) servis via HTTP, configuration injectée à la demande

Cet état ultra-minimal est cohérent avec le statut pilote. Toute extension (filtres, réservation, détail) nécessiterait une refactorisation légère mais structurante avant d'être ajoutée.

## Preuves et confiance

- **Confiance globale : medium–high**
  - **High** sur la portée réelle du code : les 3 fichiers versionnés (README, HTML, JS) ont été ouverts en entier — aucune « boîte noire », lecture exhaustive.
  - **Medium** sur la forme réelle de l'API distante : seuls les 4 champs consommés sont observables ; d'autres champs ou contraintes peuvent exister côté serveur.
  - **Medium** sur le contexte de déploiement : mécanisme d'injection de configuration non versionné, comportement en production repose sur un savoir externe.

- **Documents de référence amont**  
  Tous les constats ci-dessus sont issus de :
  - CARTE_DES_DOMAINES.md (structure métier)
  - WORKFLOW_AFFICHAGE_TRANSFERTS.md (flux détaillé)
  - FUNCTIONAL_AUDIT.md (ce qui existe et ce qui manque)
  - ARCHITECTURE_AUDIT.md (structure technique et risques)
  - CODE_HOTSPOTS_AUDIT.md (points fragiles du code)
  - DATA_MODEL_AUDIT.md (contrats et données)
  - SECURITY_ROBUSTNESS_AUDIT.md (robustesse réseau et injection)

## Recommandations de priorité

Pour une mise en production en l'état (pilote → production) :

1. **Mettre à jour la documentation** : clarifier dans le README que c'est un catalogue en lecture seule pour l'instant
2. **Ajouter une gestion d'erreur minimale** : afficher un message si l'API échoue (hotspot n°1 du code)
3. **Vérifier ou documenter l'injection de `window.API_BASE_URL`** : s'assurer que le mécanisme en production est robuste

**Pas d'urgence structurelle** pour le périmètre actuel — l'absence de dépendances et la petite taille du code réduisent les risques. Tout ajout de fonctionnalité nécessiterait une prise en compte architecturale, mais peut être repoussé.
