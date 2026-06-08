# CRM DigitalDetectives 🕵️‍♂️

![CI](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/deploy.yml/badge.svg)

## 📌 Présentation

DigitalDetectives est un CRM sur-mesure conçu pour les agences d'investigation. 
Il centralise la gestion des mandats, la facturation, l'affectation des sous-traitants, la synchronisation automatique des preuves photos (depuis le Cloud Nikon), et la communication unifiée (Emails, WhatsApp, Téléphonie CTI).

## 🛠️ Stack Technique

Ce projet utilise une architecture **Monorepo** avec des espaces de travail (Workspaces).

* **Frontend** : React 18, Vite, Zustand (State), React Router v6, Mantine UI (Thème Dark & Gold).
* **Backend** : Node.js, Express, TypeScript.
* **Base de données** : PostgreSQL gérée via Prisma ORM.

Pour explorer en profondeur le fonctionnement du projet, référez-vous au dossier `/docs` qui contient :
- [Architecture C4 (Système, Conteneurs, Composants)](./docs/architecture.md)
- [Modèle de Données (ERD Prisma)](./docs/DATA_MODEL.md)
- [Intégrations Externes (Stripe, WP, Ringover, Nikon...)](./docs/INTEGRATIONS.md)
- [Variables d'Environnement](./docs/ENV_VARS.md)

Consultez également les README spécifiques de chaque module :
- [Backend (API)](./packages/api/README.md)
- [Frontend (Web)](./packages/web/README.md)

## 📦 Structure des Dossiers

```
crm_digital_detectives/
│
├── packages/
│   ├── api/            # Backend (Express / Node.js)
│   │   ├── prisma/     # Schéma de base de données
│   │   ├── src/
│   │   │   └── modules/ # Logique métier segmentée par domaine (auth, mail, billing)
│   │
│   └── web/            # Frontend (React / Vite)
│       ├── src/
│       │   ├── app/     # Configuration globale (Routeur, Providers)
│       │   ├── pages/   # Pages de l'application
│       │   ├── features/# Logique métier (Stores, Hooks)
│       │   └── widgets/ # Composants complexes (Layout, Tableaux)
│
├── docs/               # Documentation (C4, ADR, Base de données)
├── CONTRIBUTING.md     # Guide pour les développeurs
└── package.json        # Fichier racine du monorepo
```

## 🚀 Démarrage Rapide

### Prérequis stricts
* **Node.js** : `>= 20.11.0` (utiliser `nvm use` si vous avez NVM d'installé).
* **PostgreSQL** : En cours d'exécution en local (ou via Docker).

### Installation

1. Clonez le dépôt et installez les dépendances à la racine (installe pour `api` et `web`) :
   ```bash
   npm install
   ```

2. Configurez l'environnement :
   Copiez les fichiers `.env.example` en `.env` dans `packages/api` et `packages/web`.
   Assurez-vous que l'URL de la base de données est correcte dans `packages/api/.env`.

3. Préparez la base de données (migrations Prisma) :
   ```bash
   npm run prisma:generate --workspace=packages/api
   npm run prisma:migrate --workspace=packages/api
   ```

### Lancement en développement

Pour lancer simultanément le backend et le frontend :
```bash
npm run dev
```

* Le frontend sera accessible sur : **http://localhost:5173**
* Le backend (API) sera accessible sur : **http://localhost:3000**
* La documentation Swagger de l'API sur : **http://localhost:3000/api/docs** (Accès limité aux ADMIN)

## 🤝 Contribution

Avant de créer une Pull Request, assurez-vous de lire le fichier [CONTRIBUTING.md](./CONTRIBUTING.md) et de lancer le linter localement :
```bash
npm run lint
```
