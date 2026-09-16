# DigitalDetectives - Web App (Frontend) 🎨

Bienvenue dans l'interface utilisateur web du CRM DigitalDetectives. Il s'agit d'une Single Page Application (SPA) construite pour être rapide, réactive et sécurisée.

## 🛠️ Stack Technique

- **Langage** : TypeScript
- **Framework** : React 18
- **Build Tool** : Vite
- **UI & Composants** : Mantine UI (Thème personnalisé Dark & Gold)
- **Gestion de l'état (State)** : Zustand
- **Routage** : React Router v6
- **Requêtes API** : Axios

## 📁 Architecture (FSD - Feature-Sliced Design)

Le projet utilise l'architecture **Feature-Sliced Design** pour une meilleure scalabilité et une isolation des composants.

```
packages/web/src/
├── app/         # Configuration globale, routeurs, styles de base (index.css)
├── pages/       # Vues principales de l'application (routing)
│   ├── login/
│   ├── dashboard/
│   ├── clients/
│   └── ...
├── widgets/     # Composants complexes, assemblant des features (ex: AppLayout, Sidebar)
├── features/    # Logique métier spécifique (ex: auth, billing, search)
│   └── auth/    # ex: auth.store.ts, useAuth.ts
├── entities/    # Composants métier purs (pas de logique externe)
└── shared/      # Utilitaires, hooks génériques, constantes, configuration API (axios)
```

## 🎨 Thème & Design System

Nous utilisons **Mantine UI**. Le thème est centralisé et respecte la palette de couleurs suivante :
- **Primary** : `#AB8E3D` (DigitalDetectives Gold)
- **Dark Mode** : Natif à Mantine (Teintes `#1A1B1E` / `#2C2E33`)
- **Accents** : `blue`, `green`, `red` pour les statuts et alertes.

> 💡 Nous évitons TailwindCSS afin de profiter pleinement du système de styling natif et des composants accessibles de Mantine.

## 🚀 Démarrage

- `npm run dev` : Lance le serveur de développement Vite sur le port `5173`.
- `npm run build` : Compile l'application React pour la production dans le dossier `dist`.
- `npm run lint` : Vérifie les erreurs TypeScript et ESLint.

## 🔒 Sécurité et Accès

L'accès à l'application est protégé par un composant routeur qui vérifie la présence d'un token d'authentification dans le store Zustand.
Les requêtes axios (`shared/api/config.ts`) incluent automatiquement le header `Authorization: Bearer <token>` et gèrent le flux de rafraîchissement (refresh token) de manière transparente.
