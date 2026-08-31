# DigitalDetectives - Backend API 🚀

Bienvenue dans le backend Node.js (Express) du CRM DigitalDetectives. Cette API centralise toute la logique métier, la communication avec les APIs externes, la génération de documents (PDF), et la sécurité.

## 🛠️ Stack Technique

- **Langage** : TypeScript
- **Framework** : Express.js
- **ORM** : Prisma (`@prisma/client`)
- **Base de Données** : PostgreSQL
- **Stockage** : Local ou S3 (AWS SDK / Infomaniak S3)
- **Validation** : Zod
- **Documentation** : Swagger / OpenAPI (JSDoc)
- **Tâches asynchrones** : node-cron (relances, rappels, synchronisations)

## 📁 Architecture des dossiers

```
packages/api/
├── prisma/               # Schéma de base de données (schema.prisma) et migrations
├── src/
│   ├── modules/          # Chaque module = un domaine métier (Clients, Mandats, Billing...)
│   │   ├── [nom_module]/ # Ex: auth, client, mandat
│   │   │   ├── *.controller.ts # Logique HTTP (Req/Res)
│   │   │   ├── *.service.ts    # Logique Métier pure
│   │   │   └── *.routes.ts     # Définition des routes Express
│   ├── shared/           # Code mutualisé (Helpers, Middlewares, API externes)
│   │   ├── middlewares/  # Auth, Error handling, CSRF
│   │   ├── templates/    # Templates HTML (emails, contrats)
│   │   └── cron/         # Initialisation des tâches planifiées
│   ├── app.ts            # Configuration Express (CORS, Helmet, Montage des routes)
│   └── index.ts          # Point d'entrée, démarrage du serveur HTTP et WebSocket
└── package.json
```

## 🔐 Sécurité

L'API utilise plusieurs niveaux de sécurité :
1. **JWT (JSON Web Tokens)** : Protège la majorité des routes `/api/v1/`. Les tokens ont une durée de vie courte, complétés par des Refresh Tokens stockés en base.
2. **RBAC (Rôles)** : Middleware vérifiant les permissions (`ADMIN`, `ENQUETEUR`, `SOUS_TRAITANT`).
3. **Helmet & CORS** : Protections HTTP standards.
4. **Rate Limiting** : Limite le nombre de requêtes par IP pour éviter le bruteforce.
5. **Basic Auth** : Protège la documentation Swagger (`/api/docs`).

## 📚 Documentation Swagger

La documentation interactive de l'API est générée automatiquement à partir des commentaires JSDoc (`@openapi`) présents dans les contrôleurs.

Pour y accéder :
1. Lancez le serveur : `npm run dev`
2. Ouvrez [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
3. Connectez-vous avec vos identifiants administrateur du CRM (ex: `bryan.evina@satom.ch`).

## 🚀 Commandes Utiles

- `npm run dev` : Lancer le serveur en mode développement (watch avec `tsx`).
- `npm run build` : Compiler le TypeScript en JavaScript (dossier `dist`).
- `npm run lint` : Vérifier le code avec ESLint.
- `npx prisma db push` : Synchroniser le schéma Prisma avec la BDD locale.
- `npx prisma studio` : Ouvrir l'interface graphique d'administration de la BDD.
