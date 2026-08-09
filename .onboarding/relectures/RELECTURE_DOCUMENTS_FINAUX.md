# RELECTURE — Documents finaux shift-pilot-resa-web

> **Relecteur** : ba2dd109-fb53-4d75-ab9e-b8824aa4ba32  
> **Documents contrôlés** : `CDC_FONCTIONNEL.md`, `CARTOGRAPHIE_CODE.md`, `PROJECT_CONTEXT.md`, `CAHIER_RECETTE.md`, `ECOSYSTEME.md`  
> **Amont contrôlé** : `CARTE_DES_DOMAINES.md`, les quatre workflows, les audits disponibles dans ce workspace et le code/tests référencés  
> **Verdict global** : **À CORRIGER — troisième relecture**

## Constats

### Points corrigés et acceptables

- Le CDC décrit désormais les trois parcours réellement présents (affichage, réservation, annulation), avec les effets frontend distingués des effets serveur inconnus.
- `PROJECT_CONTEXT.md` reprend les 90 lignes de `js/app.js`, les 13 tests automatisés et les deux états clients `reservations`/`pendingTransfers`.
- `CAHIER_RECETTE.md` distingue les 13 tests automatisés de la recette manuelle navigateur/API réelle ; les variations de `seatsLeft` sont correctement marquées dépendantes du contrat API.
- Les workflows et les documents fonctionnels exploitent la matière amont : gardes anti-double-clic, erreurs HTTP/réseau, état vide, champs consommés et limites de test sont présents.

### Corrections précédentes vérifiées

Les corrections demandées à la seconde relecture sont présentes :

1. `CARTOGRAPHIE_CODE.md` décrit désormais le DELETE comme « tout statut 2xx accepté côté client », avec corps non lu et serveur inconnu.
2. `CARTOGRAPHIE_CODE.md` et `CDC_FONCTIONNEL.md` parlent d'absence de mécanisme d'authentification observable côté client, sans conclure à l'anonymat serveur.
3. `CDC_FONCTIONNEL.md` reprend également la règle tout-2xx et ne présente plus l'hypothèse d'une consommation anonyme.

### Blocage restant — type de `seatsLeft` non prouvé

Dans `ECOSYSTEME.md`, section « Risque 1 », la ligne « Type attendu : nombre entier positif ou zéro » est une affirmation de contrat API qui n'est pas démontrée par le matériau amont du workspace web. Le code ne valide ni le type, ni l'entier, ni la borne : il affiche la valeur et évalue seulement `t.seatsLeft > 0` (`js/app.js`, lignes 22 et 30). Les fixtures de `js/app.test.js` ne prouvent pas le contrat de production. Reformuler en observation frontend, par exemple : « valeur utilisée dans la comparaison `> 0` ; type et bornes API inconnus », et ajuster la preuve/recommandation qui présente ce type comme exigé.

## Limites et traçabilité

Le reste du corpus est suffisamment substantiel et majoritairement traçable aux workflows/audits. Le verdict ne demande pas de réécrire le CDC, le contexte ou le plan de recette ; il demande de corriger cette formulation résiduelle dans la vue écosystème et de conserver partout la distinction `VÉRIFIÉ_CODE` / `INCONNU` / `HYPOTHÈSE`.

## Décision

**À CORRIGER.** Les corrections précédentes sont acceptées. Corriger dans `ECOSYSTEME.md` la prétention sur le type entier positif ou nul de `seatsLeft`, puis resoumettre.
