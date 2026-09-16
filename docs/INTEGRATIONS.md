# Intégrations Externes

Ce document répertorie toutes les connexions entre le CRM DigitalDetectives et les services tiers, y compris les flux de données, les webhooks, et les mécanismes de sécurité employés.

## 1. WordPress (Site Vitrine)

**Rôle :** Synchroniser les prospects (formulaires de contact) et les données du site web vers le CRM.

- **Direction :** Bidirectionnelle (WP -> CRM et CRM -> WP).
- **Webhooks :** Le plugin **WPWebhooks** est utilisé pour envoyer des données depuis WP vers le CRM. Le CRM dispose d'une route spécifique `/api/v1/sync` ou `/api/v1/webhooks` pour recevoir ces payloads.
- **Sécurité :** Authentification via `WP_APP_PASSWORD` et clés secrètes dans les URLs.
- **Fonctionnement :** Dès qu'un utilisateur remplit un formulaire sur digitaldetectives.ch, le webhook déclenche la création d'un `Client` (Prospect) dans le CRM via l'API.

## 2. Stripe (Paiements en Ligne)

**Rôle :** Gestion de la facturation et des encaissements en ligne.

- **Direction :** CRM -> Stripe (Création de session), Stripe -> CRM (Confirmation de paiement).
- **Webhooks :** Stripe appelle `/api/v1/webhooks/stripe`. Le body brut de la requête est lu par Express (via `express.raw()`) avant d'être traité par le contrôleur.
- **Sécurité :** Vérification de la signature cryptographique via `STRIPE_WEBHOOK_SECRET`.
- **Fonctionnement :**
  - L'Admin génère une facture dans le CRM. Une session de paiement Stripe est créée.
  - Le client paie via le lien sécurisé.
  - Stripe envoie l'événement `checkout.session.completed`.
  - Le CRM intercepte l'événement, retrouve l'`Invoice` grâce au `stripeSessionId` ou au `client_reference_id`, et passe son statut à `PAID`. Le mandat est également mis à jour si nécessaire.

## 3. Ringover (CTI - Téléphonie)

**Rôle :** Centraliser et historiser les appels téléphoniques directement dans le CRM.

- **Direction :** Ringover -> CRM (Webhooks de fin d'appel).
- **Webhooks :** Ringover appelle `/api/v1/webhooks/ringover` (ou routes publiques équivalentes).
- **Sécurité :** Les IPs de Ringover sont autorisées, ou un secret partagé est passé en paramètre.
- **Fonctionnement :**
  - Lorsqu'un appel est reçu ou émis, Ringover envoie le journal d'appel au CRM.
  - Le CRM fait le lien avec le `Client` via le numéro de téléphone appelant (`phone`).
  - Une nouvelle entité `Activity` de type `CALL` est ajoutée au fil d'activité du Mandat/Client.

## 4. Twilio / WhatsApp

**Rôle :** Historiser les échanges WhatsApp avec les clients.

- **Direction :** Twilio -> CRM.
- **Webhooks :** Twilio poste sur `/api/v1/webhooks/whatsapp`.
- **Sécurité :** Vérification de la signature X-Twilio-Signature via `TWILIO_AUTH_TOKEN`.
- **Fonctionnement :** Les messages envoyés ou reçus via le numéro `TWILIO_WHATSAPP_NUMBER` sont historisés comme `Activity` (type `WHATSAPP`) dans le fil du client.

## 5. Nikon Cloud / Image Space

**Rôle :** Automatiser l'importation des photos (preuves) capturées sur le terrain par les enquêteurs.

- **Direction :** Nikon -> CRM.
- **Webhooks / API :** Les appareils photo connectés uploadent sur Nikon Cloud, qui pousse ensuite les images vers `/api/v1/nikon`.
- **Sécurité :** L'authentification se fait via `NIKON_API_KEY`.
- **Fonctionnement :**
  - Le CRM reçoit le fichier et l'attribue au dossier "Preuves" du Mandat courant (via des tags ou la date).
  - Les données EXIF (géolocalisation, date de prise de vue précise) sont extraites grâce à la librairie `exifr` et stockées en base pour la recevabilité de la preuve.

## 6. UBS / SIX bLink (Connexion bancaire en lecture seule)

**Rôle :** Importer les virements reçus et les rapprocher automatiquement des factures en attente.

- **Direction :** Banque -> CRM **uniquement**. Aucun ordre n'est jamais transmis à la banque.
- **API :** Plate-forme suisse d'open banking [bLink](https://blink.six-group.com) de SIX, à laquelle UBS est raccordée.
  - Consentement : OAuth2 _authorization code_, scope `urn:blink:xs2a:ais` (Account Information Services).
  - Authentification client : certificat mTLS (bLink n'accepte pas de _client secret_), en-têtes de routage `x-corapi-target-id` / `x-corapi-client-id`.
  - Données : `GET /iso20022/statements` (relevés `camt.053`), avec repli sur `GET /accounts/{id}/transactions` (JSON paginé par `X-Next-Cursor`).
- **Sécurité :**
  - Le scope de paiement (`...:pss:write`) est rejeté par `assertReadOnlyScope()` ; l'interface `BankDataProvider` n'expose aucune écriture.
  - Les jetons OAuth sont chiffrés en base (AES-256).
  - Routes `/api/v1/banking/*` réservées au rôle `ADMIN`, actions journalisées dans `AuditLog`.
- **Mode dégradé (actif par défaut) :** en attendant le contrat SIX, le même parseur lit les relevés **camt.053 exportés depuis l'E-Banking UBS**, déposés dans `BANK_CAMT_IMPORT_DIR` ou téléversés depuis l'écran _Rapprochement bancaire_. Le contenu est identique (référence QR structurée comprise) : le passage à bLink se fait en changeant `BankAccount.provider`.
- **Fonctionnement :**
  - Chaque nuit à 6h, le cron importe les écritures des 30 derniers jours (insertion idempotente sur `(bankAccountId, externalId)`).
  - Le moteur de rapprochement note chaque virement face aux factures `PENDING` : référence QR structurée, référence CRM citée dans la communication, puis montant + nom du donneur d'ordre.
  - Au-dessus de `BANK_AUTO_MATCH_THRESHOLD` et sans candidat concurrent proche, la facture passe à `PAID` et le reçu est envoyé au client ; sinon l'écriture rejoint la file d'attente de vérification manuelle (`/banque`).
  - Les acomptes (référence correcte, montant partiel) et les écritures au débit ne sont jamais soldés automatiquement.
- **Référence QR :** `Invoice.paymentReference` porte une référence suisse à 27 chiffres (clé modulo 10 récursif). Elle est attribuée automatiquement à l'émission de la facture (`sendPaymentLinkToClient`) par `ensureInvoicePaymentReference()`, puis **imprimée sur le PDF** dans le bloc _Paiement par virement bancaire_ (bénéficiaire `COMPANY_NAME`, `COMPANY_IBAN`, référence formatée) et rappelée dans l'e-mail. C'est elle qui permet à la banque de restituer un identifiant exploitable, et donc le taux de rapprochement automatique attendu (> 70 % sur les paiements référencés).
- **Vérification :** `npx tsx packages/api/test-bank-reconciliation.ts` exerce le parseur `camt.053`, les références QR/SCOR, le moteur de décision et la boucle complète facture → relevé bancaire, et mesure le taux de rapprochement automatique.
