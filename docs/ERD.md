# ERD - CRM DigitalDetectives

Mise a jour du modele relationnel apres ajout des entites de gestion documentaire, preuves, sous-traitance et cycle financier.

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

  Service {
    string id PK
    string name
    decimal unitPrice
    decimal internalCost
    string unit
    string category
    bool isActive
  }

  Quote {
    string id PK
    string mandateId FK
    string clientId FK
    json items
    decimal totalHT
    decimal totalTTC
    decimal marginRate
    enum status
    datetime sentAt
    datetime expiresAt
  }

  QuoteItem {
    string quoteId PK, FK
    string serviceId PK, FK
    decimal quantity
    decimal unitPrice
    decimal discount
  }

  Contract {
    string id PK
    string mandateId FK
    string templateId
    json variables
    enum status
    datetime signedAt
    string signProvider
  }

  Payment {
    string id PK
    string mandateId FK
    string clientId FK
    decimal amount
    string currency
    enum status
    datetime dueDate
    datetime paidAt
    datetime matchedAt
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

  Mandate ||--o{ Quote : quotes
  Client ||--o{ Quote : quoted_to
  Quote ||--o{ QuoteItem : includes
  Service ||--o{ QuoteItem : priced_by

  Mandate ||--o{ Contract : contracts

  Mandate ||--o{ Payment : payments
  Client ||--o{ Payment : billed_to

  User ||--o{ AuditLog : logs
```

## Notes de modelisation

- exifData est stocke en JSONB (champ Prisma Json) pour conserver les metadonnees brutes.
- accessExpiresAt est obligatoire sur Subcontractor.
- Index mandateId ajoutes sur Folder, Evidence et Subcontractor.
- items est stocke en JSONB sur Quote pour snapshotter les prestations au moment de la generation.
- Index dashboard finance: mandateId et status sur Quote/Contract/Payment, plus dueDate sur Payment.
