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
