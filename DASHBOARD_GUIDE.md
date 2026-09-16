# 🎯 Dashboard Implementation Guide

## Overview

Ce document décrit l'implémentation complète des dashboards pour l'application CRM Digital Detectives. Une fois connecté, l'utilisateur accède à quatre dashboards principaux avec des statistiques en temps réel (devise: CHF).

## 📊 Dashboards Disponibles

### 1. Dashboard Principal (`/`)

**Vue d'ensemble générale avec métriques clés:**

- **Mandats actifs** - Nombre de mandats en cours
- **Clients totaux** - Nombre total de clients
- **CA du mois** - Chiffre d'affaires du mois courant (en CHF)
- **Taux de réussite** - Pourcentage de mandats complétés

Plus :

- Liste des mandats récents
- Actions urgentes
- Tâches terminées cette semaine
- Activités récentes

### 2. Clients & Mandats (`/clients`)

**Gestion complète des clients et de leurs mandats:**

- Statistiques: Clients totaux, Mandats actifs, CA total
- Recherche par nom, email ou téléphone
- Tableau complet avec:
  - ID et nom du client
  - Coordonnées de contact
  - Nombre de mandats
  - Statut
  - CA total
  - Dernier contact

### 3. Planning (`/planning`)

**Organisez vos missions et enquêteurs:**

- Statistiques: Missions en cours, Enquêteurs actifs, Heures planifiées, Taux d'occupation
- Vue hebdomadaire avec:
  - Mandat et client
  - Enquêteur assigné
  - Date et durée de la mission
  - Statut (Planifié, En cours, Modifié)

### 4. Sous-traitants & Freelances (`/subcontractors`)

**Gestion des prestataires externes:**

- Statistiques: Actifs, En mission, Heures ce mois, Disponibilités
- Liste complète avec:
  - Enquêteur / Prestataire
  - Spécialité
  - Missions et heures
  - Tarif horaire (en CHF)
  - Statut
- Missions en cours avec tarifs

## 🏗️ Architecture Technique

### Backend (API)

#### Module Statistics

```
src/modules/statistics/
├── statistics.service.ts     # Logique métier
├── statistics.controller.ts   # Endpoints
└── statistics.routes.ts       # Définition des routes
```

**Routes principales:**

- `GET /api/v1/statistics/dashboard` - Stats principales
- `GET /api/v1/statistics/urgent-actions` - Actions urgentes
- `GET /api/v1/statistics/completed-tasks` - Tâches complétées
- `GET /api/v1/statistics/mandates-by-status` - Mandats par statut
- `GET /api/v1/statistics/clients-with-mandates` - Clients avec mandats
- `GET /api/v1/statistics/revenue-by-client` - Revenus par client
- `GET /api/v1/statistics/active-subcontractors` - Sous-traitants actifs
- `GET /api/v1/statistics/hours-worked` - Heures travaillées

### Frontend (Web)

#### Structure des fichiers

```
src/
├── pages/
│   ├── dashboard/ui/DashboardPage.tsx
│   ├── clients/ui/ClientsPage.tsx
│   ├── planning/ui/PlanningPage.tsx
│   └── subcontractors/ui/SubcontractorsPage.tsx
├── shared/
│   ├── api/
│   │   ├── base.ts
│   │   ├── statistics.ts
│   │   └── client.ts
│   └── constants/
│       └── index.ts           # Formatage devise CHF
├── widgets/
│   └── layout/ui/
│       ├── AppLayout.tsx      # Navigation sidebar
│       └── StatCard.tsx       # Composant statistique réutilisable
└── app/router/index.tsx       # Routes principales
```

## 💰 Formatage Devise (CHF)

Tous les montants sont formatés en francs suisses (CHF) avec:

- **Locale:** `fr-CH`
- **Symbole:** CHF
- **Décimales:** 2 (ex: 1 234.50 CHF)

**Utilisation:**

```typescript
import { formatCurrency } from '@/shared/constants'

// Utilisation simple
const prix = formatCurrency(1500) // "1 500.00 CHF"
```

## 🔄 Flux de Données

### 1. Authentification

```
Login → Token stocké en mémoire → ProtectedRoute redirige vers Dashboard
```

### 2. Chargement des Statistiques

```
Dashboard Component montée
  ↓
useEffect déclenche StatisticsApi.getDashboardStats()
  ↓
API intercepteur ajoute le JWT token
  ↓
Backend /statistics/dashboard répond
  ↓
Composant affiche les stats formatées (CHF)
```

### 3. Navigation

```
Sidebar → NavLink vers /clients, /planning, /subcontractors
  ↓
Router active le composant approprié
  ↓
Composant charge ses données spécifiques
```

## 🔐 Sécurité

- ✅ Toutes les routes `/api/v1/statistics/*` nécessitent `authorize('ADMIN', 'ENQUETEUR')`
- ✅ Token JWT inclus automatiquement dans les requêtes via intercepteur
- ✅ Refresh automatique du token en cas d'expiration

## 📱 Responsive Design

- **Desktop:** Grille 4 colonnes pour les statistiques
- **Tablet:** Grille 2 colonnes
- **Mobile:** Grille 1 colonne

## 🚀 Points d'Intégration

### Données à Connecter

1. **Mandats récents** - Récupérer depuis `/api/v1/mandates`
2. **Clients** - Filtrer depuis `/api/v1/clients`
3. **Planning** - Mapper depuis les mandats + timeEntries
4. **Sous-traitants** - Depuis `/api/v1/subcontractors` et `mandatSubcontractors`

### Amélioration Future

```typescript
// À implémenter dans StatisticsService
- Calcul dynamique du taux de réussite
- Comparaison avec le mois précédent
- Filtrage par utilisateur (enquêteur)
- Export de données (PDF/Excel)
```

## ✅ Checklist de Déploiement

- [x] Module statistics créé et testé
- [x] Routes enregistrées dans app.ts
- [x] Pages de dashboard créées
- [x] Navigation sidebar implémentée
- [x] Formatage CHF appliqué
- [x] Pas d'erreurs TypeScript
- [ ] Données réelles connectées
- [ ] Tests e2e validés
- [ ] Déploiement en production

## 📝 Fichiers Modifiés

### Backend

- `packages/api/src/app.ts` - Enregistrement routes statistics
- ✨ Nouveaux fichiers dans `packages/api/src/modules/statistics/`

### Frontend

- `packages/web/src/app/router/index.tsx` - Nouvelles routes
- `packages/web/src/pages/dashboard/ui/DashboardPage.tsx` - Mise à jour
- `packages/web/src/widgets/layout/ui/AppLayout.tsx` - Navigation
- ✨ Nouvelles pages et composants créés
- ✨ Nouveaux fichiers API et constantes

## 🤝 Support

Pour des questions ou des améliorations, consultez:

- Documentation Mantine: https://mantine.dev
- Axios: https://axios-http.com
- React Router: https://reactrouter.com

---

**Version:** 1.0  
**Dernière mise à jour:** Mai 2026  
**Devise:** CHF (Francs Suisses)
