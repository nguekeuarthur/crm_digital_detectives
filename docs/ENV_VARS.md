# Variables d'Environnement

Ce guide référence toutes les variables d'environnement requises par l'API backend du CRM DigitalDetectives. Elles doivent être configurées dans un fichier `.env` à la racine de `packages/api/`.

> [!WARNING]
> Ne commitez jamais votre fichier `.env` ! Utilisez `.env.example` pour partager la structure.

## Configuration Système & Sécurité

| Variable | Type | Défaut | Description |
|---|---|---|---|
| `PORT` | Number | `3000` | Le port d'écoute du serveur Express. |
| `NODE_ENV` | String | `development` | L'environnement d'exécution (`development` ou `production`). |
| `DATABASE_URL` | URI | N/A | L'URL de connexion à la base de données PostgreSQL via Prisma. |
| `JWT_SECRET` | String | N/A | La clé secrète pour signer les jetons d'authentification principaux (Access Tokens). |
| `REFRESH_SECRET` | String | N/A | La clé secrète pour signer les jetons de rafraîchissement (Refresh Tokens). |

## Stockage & Fichiers

| Variable | Type | Défaut | Description |
|---|---|---|---|
| `STORAGE_STRATEGY` | String | `LOCAL` | Stratégie de stockage des preuves. Valeurs possibles: `LOCAL` ou `S3`. |
| `STORAGE_PATH` | Path | `./uploads` | Le chemin de stockage local (utilisé si `STORAGE_STRATEGY=LOCAL`). |
| `ENCRYPTION_KEY` | String (32b) | N/A | Clé de chiffrement AES-256 pour sécuriser les fichiers sensibles. |
| `S3_ENDPOINT` | URL | N/A | Endpoint du service S3 (ex: `https://s3.cloud.infomaniak.com`). |
| `S3_REGION` | String | `lyon` | La région d'hébergement S3. |
| `S3_ACCESS_KEY` | String | N/A | Clé d'accès S3 (Access Key ID). |
| `S3_SECRET_KEY` | String | N/A | Clé secrète S3 (Secret Access Key). |
| `S3_BUCKET` | String | N/A | Le nom du bucket S3 dans lequel les preuves seront stockées. |

## Communication (E-mail & WhatsApp)

| Variable | Type | Défaut | Description |
|---|---|---|---|
| `SMTP_HOST` | String | N/A | Hôte SMTP pour l'envoi d'e-mails (ex: `mail.infomaniak.com`). |
| `SMTP_PORT` | Number | `587` | Port SMTP (587 pour TLS). |
| `SMTP_USER` | String | N/A | Nom d'utilisateur SMTP (généralement l'adresse e-mail). |
| `SMTP_PASS` | String | N/A | Mot de passe SMTP ou mot de passe d'application. |
| `SMTP_FROM` | String | N/A | Adresse e-mail d'expédition par défaut (ex: `noreply@digitaldetectives.ch`). |
| `IMAP_HOST` | String | N/A | Hôte IMAP pour la lecture d'e-mails entrants (ex: `mail.infomaniak.com`). |
| `IMAP_PORT` | Number | `993` | Port IMAP (993 pour SSL). |
| `TWILIO_ACCOUNT_SID` | String | N/A | Identifiant du compte Twilio pour WhatsApp. |
| `TWILIO_AUTH_TOKEN` | String | N/A | Jeton d'authentification Twilio. |
| `TWILIO_WHATSAPP_NUMBER`| String | N/A | Numéro WhatsApp expéditeur (ex: `whatsapp:+14155238886`). |

## Intégrations Externes (WordPress, Nikon, Stripe)

| Variable | Type | Défaut | Description |
|---|---|---|---|
| `WP_URL` | URL | N/A | L'URL du site vitrine WordPress (pour l'API REST). |
| `WP_WEBHOOK_URL` | URL | N/A | URL cible pour envoyer des webhooks au plugin WPWebhooks. |
| `WP_USERNAME` | String | N/A | Nom d'utilisateur WordPress pour l'API REST. |
| `WP_APP_PASSWORD` | String | N/A | Mot de passe d'application généré dans WordPress. |
| `NIKON_API_KEY` | String | N/A | Clé secrète permettant d'authentifier les webhooks venant de Nikon Cloud. |
| `STRIPE_SECRET_KEY` | String | N/A | Clé API secrète de Stripe (`sk_live_...` ou `sk_test_...`). |
| `STRIPE_WEBHOOK_SECRET`| String | N/A | Clé secrète de signature des webhooks Stripe (`whsec_...`). |
