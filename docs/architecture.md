# Architecture C4 (Niveau 1 et 2)

## 1. Contexte Système (Niveau 1)

Ce diagramme montre le CRM DigitalDetectives dans son environnement, avec les utilisateurs et les systèmes externes avec lesquels il interagit.

```mermaid
C4Context
    title Architecture Système - CRM DigitalDetectives

    Person(investigator, "Enquêteur / Admin", "Gère les mandats, les clients, les factures et les sous-traitants.")
    Person(subcontractor, "Sous-traitant", "Reçoit des missions, pointe ses heures et facture ses prestations.")
    
    System(crm, "CRM DigitalDetectives", "Application de gestion des mandats, de facturation et de suivi d'enquêtes.")
    
    System_Ext(nikon_cloud, "Nikon Image Space", "Stockage Cloud des photos synchronisées depuis les appareils Nikon.")
    System_Ext(twilio, "Twilio / WhatsApp", "Service de messagerie instantanée avec les clients.")
    System_Ext(ringover, "Ringover", "CTI (téléphonie) pour les appels entrants et sortants.")
    System_Ext(payment_gateway, "Stripe / Mollie", "Passerelle de paiement en ligne pour les clients finaux.")

    Rel(investigator, crm, "Utilise (Gère les enquêtes)")
    Rel(subcontractor, crm, "Utilise (Consulte ses missions)")
    
    Rel(crm, nikon_cloud, "Récupère les preuves via webhook/cron")
    Rel(crm, twilio, "Envoie/reçoit des messages")
    Rel(crm, ringover, "Intégration téléphonie (CTI)")
    Rel(crm, payment_gateway, "Crée des liens de paiement, écoute les statuts")
```

## 2. Conteneurs (Niveau 2)

Ce diagramme détaille l'intérieur du système CRM, montrant l'application Web Frontend, l'API Backend et la Base de données.

```mermaid
C4Container
    title Architecture Conteneurs - CRM DigitalDetectives

    Person(user, "Utilisateurs (Enquêteurs & Sous-traitants)")
    
    Container_Boundary(crm_system, "Système CRM") {
        Container(spa, "Web App (Frontend)", "React, Vite, Zustand", "Interface utilisateur unique (SPA) pour la gestion du CRM. Communique via des appels REST.")
        Container(api, "API (Backend)", "Node.js, Express, TypeScript", "Point d'entrée logique métier. Gère l'authentification, les règles métier, la génération de PDF et les appels aux API externes.")
        ContainerDb(db, "Base de Données", "PostgreSQL", "Stocke les informations sur les clients, les mandats, les utilisateurs et la facturation.")
    }
    
    System_Ext(external, "Services Tiers", "Nikon, Twilio, Stripe, Ringover")

    Rel(user, spa, "Navigue sur (HTTPS)")
    Rel(spa, api, "Requêtes REST (JSON, JWT)")
    Rel(api, db, "Lit et écrit (Prisma ORM)")
    Rel(api, external, "Appels API / Webhooks")
```
