# CRM DigitalDetectives

## Contexte

Ce repository initialise le projet CRM DigitalDetectives en architecture monorepo.

- `packages/api` : backend Node.js / Express
- `packages/web` : frontend React / Vite

## Prerequis

- Node.js `20.11.0` (voir `.nvmrc`)
- npm `>=10`

## Installation

```bash
npm install
```

## Scripts racine

- `npm run dev` : lance les scripts `dev` de tous les workspaces
- `npm run build` : lance les scripts `build` de tous les workspaces
- `npm run test` : lance les scripts `test` de tous les workspaces
- `npm run lint` : lance les scripts `lint` de tous les workspaces
- `npm run lint:fix` : corrige automatiquement les erreurs ESLint
- `npm run format` : formate le code avec Prettier
- `npm run format:check` : verifie le formatage sans modifier les fichiers

## Qualite et commits

- ESLint est configure avec la base Standard et les plugins React/React Hooks.
- Prettier est integre via `eslint-config-prettier`.
- Husky + lint-staged lancent le lint/format sur les fichiers stagés au `pre-commit`.
- Commitlint valide les messages de commit au format Conventional Commits.

Types de commit recommandes :

- `feat`: nouvelle fonctionnalite
- `fix`: correction de bug
- `chore`: tache technique ou maintenance
- `docs`: documentation
- `test`: ajout ou mise a jour de tests

Exemples :

- `feat(api): ajouter endpoint de sante`
- `fix(web): corriger rendu du dashboard`
- `docs(readme): ajouter conventions de commit`

## Demarrage

```bash
npm run dev
```

## Structure

```text
.
├─ packages/
│  ├─ api/
│  └─ web/
├─ .gitignore
├─ .nvmrc
├─ package.json
└─ README.md
```
