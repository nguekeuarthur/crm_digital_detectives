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
