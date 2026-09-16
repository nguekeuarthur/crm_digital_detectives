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

## 3. Composants (Niveau 3 - Backend API)

Ce diagramme illustre les composants internes clés de l'API (Backend Node.js/Express) et leurs interactions.

```mermaid
C4Component
    title Architecture Composants - API Backend

    Container_Boundary(api, "API (Express.js)") {
        Component(router, "Routeur Express", "Routes, Middleware (Auth, CORS, Rate Limit)", "Aiguille les requêtes HTTP vers les bons contrôleurs.")
        Component(auth_controller, "Auth Controller", "Logique d'authentification", "Gère la connexion, les JWT, le 2FA.")
        Component(crm_controller, "CRM Controllers", "Clients, Mandats, Devis, Factures", "Gère la logique métier du CRM.")
        Component(webhook_controller, "Webhook Controllers", "Stripe, WP, Ringover", "Écoute les événements externes et met à jour le système.")
        
        Component(prisma_client, "Prisma ORM", "Couche d'accès aux données", "Génère les requêtes SQL et gère le schéma de la BDD.")
        Component(cron_jobs, "Cron Jobs", "node-cron", "Tâches asynchrones (relances, rappels, synchronisations).")
        Component(email_service, "Email & PDF Service", "Nodemailer, Puppeteer", "Génère les factures PDF et envoie les emails (templates).")
    }

    ContainerDb(db, "Base de Données", "PostgreSQL", "Schéma : User, Client, Mandat, Invoice, etc.")
    System_Ext(external, "APIs Tiers", "Stripe, WP, Ringover, Nikon")

    Rel(router, auth_controller, "Aiguille vers", "Appel interne")
    Rel(router, crm_controller, "Aiguille vers", "Appel interne")
    Rel(router, webhook_controller, "Aiguille vers", "Appel interne")
    
    Rel(auth_controller, prisma_client, "Lit/Écrit", "Appel ORM")
    Rel(crm_controller, prisma_client, "Lit/Écrit", "Appel ORM")
    Rel(webhook_controller, prisma_client, "Lit/Écrit", "Appel ORM")
    
    Rel(crm_controller, email_service, "Déclenche génération PDF/Emails", "Appel Service")
    Rel(cron_jobs, prisma_client, "Vérifie les retards", "Appel ORM")
    Rel(cron_jobs, email_service, "Déclenche relances", "Appel Service")
    
    Rel(prisma_client, db, "Requêtes SQL", "TCP/IP")
    Rel(webhook_controller, external, "Écoute et interagit", "HTTPS")
    Rel(email_service, external, "SMTP (via Email provider)", "SMTP")
```
