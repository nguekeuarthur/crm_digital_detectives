# ERD - CRM DigitalDetectives

Mise a jour du modele relationnel apres ajout des entites de gestion documentaire, preuves et sous-traitance.

```mermaid
erDiagram
  User {
    string id PK
    string email
    string passwordHash
    enum role
    datetime createdAt
    datetime lastLogin
  }

  Client {
    string id PK
    string firstName
    string lastName
    string email
    string wpUserId
    datetime deletedAt
  }

  Mandate {
    string id PK
    string clientId FK
    string createdBy FK
    string title
    string type
    enum status
    int priority
    datetime deletedAt
  }

  MandateUser {
    string mandateId PK, FK
    string userId PK, FK
    enum role
    datetime assignedAt
  }

  Folder {
    string id PK
    string mandateId FK
    string parentId FK
    string name
    enum type
  }

  File {
    string id PK
    string folderId FK
    string uploadedBy FK
    string storagePath
    json exifData
    decimal geoLat
    decimal geoLng
    datetime capturedAt
  }

  Evidence {
    string id PK
    string fileId FK
    string mandateId FK
    string observerUserId FK
    enum source
    datetime capturedAt
  }

  Subcontractor {
    string id PK
    string userId FK
    string mandateId FK
    decimal hourlyRate
    datetime accessExpiresAt
    decimal hoursWorked
    enum status
  }

  AuditLog {
    string id PK
    string userId FK
    string entityType
    string entityId
    json payload
  }

  Client ||--o{ Mandate : owns
  User ||--o{ Mandate : creates
  Mandate ||--o{ MandateUser : assigns
  User ||--o{ MandateUser : participates

  Mandate ||--o{ Folder : contains
  Folder ||--o{ Folder : nests
  Folder ||--o{ File : stores
  User ||--o{ File : uploads

  File ||--o| Evidence : qualifies
  Mandate ||--o{ Evidence : tracks
  User ||--o{ Evidence : observes

  User ||--o{ Subcontractor : subcontracts
  Mandate ||--o{ Subcontractor : grants_access

  User ||--o{ AuditLog : logs
```

## Notes de modelisation

- exifData est stocke en JSONB (champ Prisma Json) pour conserver les metadonnees brutes.
- accessExpiresAt est obligatoire sur Subcontractor.
- Index mandateId ajoutes sur Folder, Evidence et Subcontractor.
