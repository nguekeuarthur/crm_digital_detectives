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
- **Référence de paiement :** `Invoice.paymentReference` est attribuée automatiquement à l'émission de la facture (`sendPaymentLinkToClient`) par `ensureInvoicePaymentReference()`. **Son format est imposé par le compte à créditer**, et le CRM le choisit seul :
  - `COMPANY_IBAN` est un **QR-IBAN** (identifiant d'institut 30000–31999) → référence QR à 27 chiffres, clé modulo 10 récursif ;
  - `COMPANY_IBAN` est un **IBAN ordinaire** → référence créancier **SCOR** (`RF…`, ISO 11649, clé modulo 97).
    Mélanger les deux fait rejeter le virement par la banque du client ; `qr-bill.service.ts` refuse de produire une section paiement incohérente.
- **QR-facture :** la section paiement normalisée (récépissé + QR code avec croix suisse) est ajoutée en bas de la facture par `attacherQrBill()`, via `swissqrbill`. Le client scanne : son application bancaire reprend seule le bénéficiaire, le montant et la référence, sans recopie. C'est ce qui transforme le taux de rapprochement théorique en taux réel — les paiements référencés sont rapprochés automatiquement, les autres non.
  - Prérequis : adresse structurée complète du bénéficiaire (`COMPANY_NAME`, `COMPANY_STREET`, `COMPANY_POSTAL_CODE`, `COMPANY_CITY`). Si elle manque, aucune section n'est produite, le motif est journalisé et la facture retombe sur les coordonnées en texte — elle part toujours.
  - La zone _Payable par_ est laissée vide, à remplir à la main : le CRM ne stocke l'adresse client qu'en texte libre, alors que la norme impose des champs séparés depuis l'abandon des adresses combinées. Une adresse mal découpée ferait échouer le paiement.
  - Une facture acquittée ne porte pas de section paiement.
- **Vérification :** `npx tsx packages/api/test-bank-reconciliation.ts` exerce le parseur `camt.053`, les références QR/SCOR, le moteur de décision et la boucle complète facture → relevé bancaire, et mesure le taux de rapprochement automatique. `npx tsx packages/api/essai-qr-facture.ts` vérifie la section paiement dans ses quatre situations.
- **Mise en service :** la marche à suivre pas à pas, destinée au titulaire du compte autant qu'à l'équipe technique, est dans `docs/Liaison-bancaire-UBS.pdf`. Ce PDF est un produit de construction : modifier `docs/src/liaison-bancaire.html`, régénérer avec `python docs/src/build-pdf.py`, et commiter les deux. Ne pas éditer le PDF directement.

## 7. Skribble (Signature électronique des contrats)

**Rôle :** Faire signer les contrats par le client, avec une valeur juridique en droit suisse.

- **Direction :** CRM → Skribble (création de la demande), Skribble → CRM (retour après signature).
- **Choix du prestataire :** en droit suisse, seule la **signature électronique qualifiée (SEQ)** équivaut à une signature manuscrite (art. 14 al. 2bis CO), et elle suppose un certificat délivré par un prestataire reconnu au titre de la SCSE — ils sont quatre (Swisscom, DigiCert Switzerland, SwissSign, SIGN8), plus l'OFIT pour l'administration. **Dropbox Sign propose la signature qualifiée au sens eIDAS (UE), pas au sens suisse** : il ne répond donc pas à l'exigence. Skribble porte nativement la SCSE/ZertES, expose une API REST et héberge en Suisse ou en Allemagne.
- **Niveaux :** `SIGNATURE_QUALITY` vaut `QES` (qualifiée), `AES` (avancée) ou `SES` (simple). La qualifiée impose au client une **identification préalable** (appel vidéo ou eID, ~22.50 CHF une fois) : c'est un frein commercial réel, à mettre en balance avec la valeur probante recherchée. Le contrat de mandat n'exige en principe aucune forme particulière.
- **Coût :** l'API n'est incluse qu'à partir de l'offre Business/Pro de Skribble, avec un coût par signature. Un essai gratuit de 14 jours donne accès à tout — à n'ouvrir qu'une fois le circuit prêt.
- **Mode simulation (actif par défaut) :** tant que `SIGNATURE_PROVIDER` ne vaut pas `SKRIBBLE`, le connecteur `MockProvider` rejoue le cycle complet en local, sans appel externe ni signature facturée. Le document qu'il produit porte une page de garde « DOCUMENT DE SIMULATION — aucune valeur juridique ».
- **Fonctionnement :**
  - `POST /contracts/:id/send-for-signature` crée la demande et fait adresser au client une invitation par le prestataire. **Le client n'a aucun compte à créer** : son identité est transmise dans `signer_identity_data`.
  - Le contrat suit son cycle : `DRAFT → SENT → SIGNED | DECLINED | WITHDRAWN | ERROR`. Un contrat déjà envoyé ne peut pas l'être une seconde fois sans annulation préalable.
  - Au retour, le document signé est archivé **à côté de l'original**, dans le même dossier du mandat, suffixé `_signe.pdf`, puis envoyé au client en confirmation.
  - Un cron horaire rattrape les demandes dont le retour se serait perdu.
- **Contrôle d'accès :** les routes de signature passent par `authorizeContract` — un enquêteur n'agit que sur les contrats des mandats qui lui sont assignés, les ADMIN passent, et toute tentative refusée est journalisée (`ACCESS_DENIED`). Le middleware `authorizeMandat` ne convenait pas : il lit `:id` comme un identifiant de mandat, là où les routes de contrat y placent celui du contrat.
- **Plancher de niveau :** `SIGNATURE_MIN_QUALITY` fixe le niveau minimal accepté. La vérification est faite **dans le service**, pas seulement à l'entrée HTTP : ni une route, ni un cron, ni un script ne peuvent faire signer un contrat à un niveau moins engageant que celui retenu par l'agence.
- **Sécurité :** Skribble n'émet pas de webhook signé cryptographiquement — il appelle les URL fournies à la création. Le CRM y place donc un **jeton aléatoire propre à chaque contrat**, et surtout **ne se fie jamais au contenu de l'appel** : il réinterroge le prestataire pour connaître l'état réel. Un appel forgé ne peut pas faire basculer un contrat en signé. Un jeton inconnu reçoit un `200` (ne pas révéler les jetons valides, ne pas faire boucler le prestataire).
- **Vérification :** `npx tsx packages/api/essai-122.ts` exerce le circuit complet contre la base — envoi, garde-fous, signature, archivage, idempotence, refus, annulation et journal d'audit — en simulation, sans toucher de client réel.
