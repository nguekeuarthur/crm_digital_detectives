# Guide de Contribution

Bienvenue dans le guide de contribution du projet CRM DigitalDetectives.

## 1. Conventions de Code

- **TypeScript** : Activez le mode strict. Le typage `any` est proscrit.
- **Linting & Formatage** : Utilisez ESLint et Prettier.
  - Avant de commit, exécutez toujours `npm run lint`.
- **Frontend** :
  - Composants fonctionnels React avec Hooks.
  - Gestion d'état locale avec `useState`/`useReducer`.
  - Gestion d'état globale avec Zustand.
  - Styles via Mantine (pas de CSS/SCSS natif).
- **Backend** :
  - Architecture modulaire (`src/modules/[feature]`).
  - Utilisation systématique de Prisma pour l'interaction base de données.

## 2. Convention de Commit

Nous utilisons **Conventional Commits** :
- `feat:` (nouvelle fonctionnalité)
- `fix:` (correction de bug)
- `docs:` (documentation)
- `style:` (formatage, points-virgules manquants, etc; sans changement de logique)
- `refactor:` (changement de code qui ne corrige ni un bug ni n'ajoute une fonctionnalité)
- `test:` (ajout de tests manquants)
- `chore:` (mise à jour des outils de build, scripts, etc.)

*Exemple : `feat(billing): ajout du rapprochement bancaire Stripe`*

## 3. Workflow de Branche (Git Flow Simplifié)

1. **`main`** : Branche principale, toujours déployable en production.
2. **`dev` / `staging`** : Branche d'intégration.
3. **`feature/[nom-de-la-feature]`** : Pour développer une nouvelle tâche (ex: `feature/module-contrats`).
4. **`fix/[nom-du-bug]`** : Pour corriger un bug.

### Procédure :
1. Créez une branche depuis `main` (ex: `git checkout -b feature/ma-super-feature`).
2. Développez et commitez régulièrement.
3. Poussez sur GitHub et ouvrez une Pull Request (PR) vers `main`.
4. La CI s'assurera que le code compile et que le linter passe.
5. Après validation par un pair (Code Review), la PR est fusionnée.
