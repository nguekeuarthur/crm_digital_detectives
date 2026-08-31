# Modèle de données (ERD)

Ce document présente l'architecture de la base de données du CRM DigitalDetectives, généré à partir du schéma Prisma.

## Diagramme Entité-Relation (ERD)

```mermaid
erDiagram
    User {
        String id PK
        String email
        String password
        String firstName
        String lastName
        Role role
    }

    Client {
        String id PK
        String email
        String firstName
        String lastName
        ClientStatus status
    }

    Mandat {
        String id PK
        String title
        MandatStatus status
        String clientId FK
        String enqueteurId FK
    }

    Dossier {
        String id PK
        String name
        String mandatId FK
        String parentId FK
    }

    File {
        String id PK
        String name
        String key
        String mimeType
        String folderId FK
    }

    Invoice {
        String id PK
        Float amount
        InvoiceStatus status
        String mandatId FK
    }

    Quote {
        String id PK
        String reference
        QuoteStatus status
        String mandatId FK
        String clientId FK
    }

    Service {
        String id PK
        String name
        Float unitPrice
        ServiceCategory category
    }

    User ||--o{ Mandat : "est assigné à (Enquêteur)"
    Client ||--o{ Mandat : "possède"
    Mandat ||--o{ Dossier : "contient"
    Dossier ||--o{ Dossier : "sous-dossiers"
    Dossier ||--o{ File : "stocke"
    
    Mandat ||--o{ Invoice : "facturation"
    Mandat ||--o{ Quote : "devis associés"
    Client ||--o{ Quote : "demande"
```

## Description des Entités Principales

### `User` (Utilisateurs internes)
Représente les employés du cabinet (Administrateurs, Enquêteurs) ainsi que les Sous-traitants. Gère l'authentification (Mots de passe, 2FA) et les droits d'accès via l'attribut `Role`.

### `Client`
Les clients de l'agence. Peuvent être des prospects (`PROSPECT`) ou des clients actifs (`ACTIF`). Un client peut être rattaché à plusieurs mandats et avoir plusieurs devis ou factures.

### `Mandat`
Le cœur du CRM. Représente une enquête ou une mission confiée par un `Client` et assignée à un `User` (Enquêteur). Possède un statut (`OUVERT`, `EN_COURS`, `TERMINE`, etc.) et sert de point d'ancrage pour les factures, devis, fichiers et sous-traitants.

### `Dossier` & `File`
Gestion documentaire par mandat. Les dossiers peuvent être imbriqués (hiérarchie via `parentId`). `File` représente les preuves (photos, vidéos, rapports) stockées sur S3/Infomaniak, incluant les métadonnées géographiques et EXIF (pour les photos Nikon, par exemple).

### `Quote` (Devis) & `Service` (Catalogue)
Permet de chiffrer une mission avant de la démarrer. `Quote` est constitué de plusieurs `QuoteItem` (non affichés dans l'ERD simplifié), qui se basent sur les tarifs standardisés du catalogue `Service`.

### `Invoice` (Factures)
Représente un paiement dû par un client pour un mandat. Géré via Stripe (Payment Intent / Checkout Session). Intègre un suivi automatique des relances grâce à l'échéance (`dueDate`).
