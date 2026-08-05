# PROJECT_CONTEXT — shift-pilot-resa-web

> **Confiance : medium.** Périmètre réduit mais intégralement lu : 2 domaines, 20 lignes de code, aucune dépendance. Confiance plafonnée par la petite taille du corpus (pilote de test) et par l'opacité de l'API distante qui alimente l'interface.

## Nature du projet

**Front client statique** pour consulter les transferts inter-îles (Polynésie française). Interface HTML + JavaScript natif sans framework ni build. Interroge une API distante (`shift-pilot-resa-api`, dépôt séparé du même projet) et affiche la liste des trajet disponibles avec prix (XPF) et places restantes.

Le `README.md` promet une *« interface de réservation »* — aucun code de réservation n'existe dans ce workspace. Probablement une fonctionnalité réservée au dépôt API ou prévue mais non implémentée.

## Domaines clés

### 1. Consultation des transferts (`consultation-transferts`)
- **Rôle** : affiche la liste des transferts inter-îles au chargement de page
- **Criticité** : haute — c'est l'unique fonction métier visibilité
- **État** : complet pour la lecture seule ; aucune interaction utilisateur, aucun filtre, tri ou pagination
- **Preuves** : `js/app.js:5-16`, `index.html:8-9`

### 2. Intégration à l'API (`integration-api`)
- **Rôle** : couche technique reliant le front à `shift-pilot-resa-api`
- **Criticité** : haute — toute la logique métier dépend de cet appel unique
- **État** : configuré par injection de `window.API_BASE_URL` avec fallback `http://localhost:3100`
- **Preuves** : `js/app.js:2-3,6`

## Points de vigilance immédiats

### Robustesse critiquement faible
- Aucune gestion d'erreur sur l'appel API → si celui-ci échoue, la page reste silencieuse, vide
- Aucune validation du schéma → si la forme de la réponse API change, l'affichage montre `undefined`
- **Impact** : l'expérience utilisateur est dégradée sans diagnostic

### Coupure entre promesse et réalité
- `README.md` annonce réservation absent du code
- À clarifier : fonctionnalité prévue ou résidant uniquement dans l'API ?

### Configuration de production inconnue
- Aucun fichier de déploiement, d'infrastructure ni de configuration serveur
- `window.API_BASE_URL` doit être injectée par l'environnement hôte (mécanisme non documenté)
- **Risque** : sans cette injection, le fallback localhost est inaccessible en production

## États du projet

| Dimension | État |
|-----------|------|
| **Code** | Complet pour la consultation ; embryonnaire globalement (20 lignes, 1 fonction métier) |
| **Tests** | Zéro — aucun framework, aucune CI/CD |
| **Sécurité** | Acceptable pour un pilote (XSS maîtrisé) ; robustesse réseau absente |
| **Performance** | Non applicable (page statique, appel unique) |
| **Docs** | README basique ; mécanisme de déploiement non documenté |

## Périmètre et incertitudes

**Inclus dans ce workspace** :
- Interface de visualisation des transferts
- Configuration d'endpoint API par variable globale

**Hors périmètre** (vivent dans `shift-pilot-resa-api` ou l'infrastructure) :
- Logique métier de réservation (absence de preuve ici)
- Forme réelle de la ressource `/transfers` (seuls les champs lus sont connus : `from`, `to`, `price`, `availableSeats`)
- Authentification API (aucun en-tête `Authorization` présent)
- Déploiement et injection de `window.API_BASE_URL` en production
- Configuration du serveur statique (CSP, en-têtes CORS)

## Prochaines étapes recommandées

1. **Clarifier la réservation** : est-elle prévue dans ce front ou uniquement dans l'API ?
2. **Documenter le déploiement** : comment `window.API_BASE_URL` est injectée en production ?
3. **Ajouter robustesse réseau** : `try/catch`, gestion d'état de chargement, affichage d'erreur
4. **Tester l'intégration API** : la forme réelle de `/transfers` doit être validée (schéma, mock)

## Artefacts de synthèse

- `CDC_FONCTIONNEL.md` — ce que l'interface fait en détail
- `CARTOGRAPHIE_CODE.md` — où c'est implémenté
- `CAHIER_RECETTE.md` — comment tester
- `.onboarding/audits/` — analyses détaillées (architecture, code, sécurité, tests, données)
- `.onboarding/workflows/` — flux analysés ligne par ligne
