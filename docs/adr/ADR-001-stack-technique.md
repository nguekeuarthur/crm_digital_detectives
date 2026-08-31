# ADR-001 : Choix de la Stack Technique (Node.js, React, PostgreSQL)

## Date
2026-05-28

## Statut
Accepté

## Contexte
L'application CRM "DigitalDetectives" nécessite un backend robuste pour gérer des données critiques (clients, mandats, paiements) et un frontend interactif pour les enquêteurs et sous-traitants. L'équipe a besoin d'une pile technique moderne, maintenable et capable d'évoluer.

## Décision
Nous avons choisi d'utiliser :
- **Backend** : Node.js avec Express (TypeScript).
- **Frontend** : React.js avec Vite (TypeScript).
- **Base de données** : PostgreSQL.

## Conséquences
- **Avantages** :
  - **Langage unique** : L'utilisation de TypeScript de bout en bout (Fullstack) réduit la charge cognitive et permet le partage de code (types, constantes).
  - **Écosystème** : L'écosystème NPM offre des bibliothèques matures pour nos besoins (Zustand pour l'état, Axios pour les requêtes, nodemailer, etc.).
  - **Fiabilité des données** : PostgreSQL est un SGBD relationnel ACID, idéal pour les données structurées et les transactions financières (factures, paiements).
- **Inconvénients** :
  - Node.js n'est pas optimal pour les calculs lourds synchrones (traitement massif d'images CPU), mais notre traitement de photos/EXIF sera délégué de manière asynchrone.
