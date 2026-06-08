# ADR-002 : Architecture Monorepo

## Date
2026-05-28

## Statut
Accepté

## Contexte
Le projet est composé d'une API backend et d'une Web App frontend. Historiquement, ces projets sont parfois séparés dans deux dépôts Git différents, ce qui complique la synchronisation des déploiements et le partage du code.

## Décision
Nous adoptons une architecture **Monorepo** utilisant **NPM Workspaces** (ou Yarn/Pnpm Workspaces). 
La structure est la suivante :
- `/packages/api` : Le code backend.
- `/packages/web` : Le code frontend.
- `/packages/shared` (optionnel) : Pour les interfaces et types partagés.

## Conséquences
- **Avantages** :
  - **Single Source of Truth** : Une seule Pull Request peut contenir les modifications de l'API et l'adaptation correspondante dans le frontend.
  - **Partage de code** : Facilite grandement le partage des types TypeScript (modèles Prisma partagés).
  - **CI/CD** : Déclenchement d'un pipeline global qui valide la cohérence des deux applications ensemble.
- **Inconvénients** :
  - Augmentation du temps de build global si les outils de build ne mettent pas en cache intelligemment (d'où l'utilisation de Vite pour le front).
  - Le dépôt peut grossir plus vite, bien que ce ne soit pas un problème majeur à notre échelle.
