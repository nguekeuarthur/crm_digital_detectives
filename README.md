# CRM DigitalDetectives

[![CI](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/ci.yml/badge.svg)](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/ci.yml)
[![Deploy](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/deploy.yml/badge.svg)](https://github.com/nguekeuarthur/crm_digital_detectives/actions/workflows/deploy.yml)

## Contexte

Ce repository initialise le projet CRM DigitalDetectives en architecture monorepo.

- `packages/api` : backend Node.js / Express
- `packages/web` : frontend React / Vite

## Prerequis

- Node.js `20.11.0` (voir `.nvmrc`)
- npm `>=10`

## Installation

```bash
npm install
```

## Scripts racine

- `npm run dev` : lance les scripts `dev` de tous les workspaces
- `npm run build` : lance les scripts `build` de tous les workspaces
- `npm run test` : lance les scripts `test` de tous les workspaces
- `npm run lint` : lance les scripts `lint` de tous les workspaces
- `npm run lint:fix` : corrige automatiquement les erreurs ESLint
- `npm run format` : formate le code avec Prettier
- `npm run format:check` : verifie le formatage sans modifier les fichiers

## Qualite et commits

- ESLint est configure avec la base Standard et les plugins React/React Hooks.
- Prettier est integre via `eslint-config-prettier`.
- Husky + lint-staged lancent le lint/format sur les fichiers stagés au `pre-commit`.
- Commitlint valide les messages de commit au format Conventional Commits.

Types de commit recommandes :

- `feat`: nouvelle fonctionnalite
- `fix`: correction de bug
- `chore`: tache technique ou maintenance
- `docs`: documentation
- `test`: ajout ou mise a jour de tests

Exemples :

- `feat(api): ajouter endpoint de sante`
- `fix(web): corriger rendu du dashboard`
- `docs(readme): ajouter conventions de commit`

## Demarrage

```bash
npm run dev
```

## Structure

```text
.
├─ packages/
│  ├─ api/
│  └─ web/
├─ .gitignore
├─ .nvmrc
├─ package.json
└─ README.md
```

## Mise en Production : Twilio (WhatsApp) & Ringover (Téléphonie)

Pour que l'intégration fonctionne en production, le client final (Digitaldetectives) doit créer ses propres comptes professionnels et vous transmettre les informations de configuration suivantes à insérer dans le fichier `.env` du backend en production :

### 1. Twilio (WhatsApp Business API)

- **Création du compte** : Le client doit créer un compte sur [Twilio](https://www.twilio.com) et faire valider son numéro de téléphone professionnel pour WhatsApp Business.
- **Identifiants à fournir** :
  - `TWILIO_ACCOUNT_SID` : L'identifiant unique de son compte Twilio.
  - `TWILIO_AUTH_TOKEN` : Le jeton d'authentification secret de son compte.
  - `TWILIO_WHATSAPP_NUMBER` : Le numéro de téléphone WhatsApp validé par Twilio au format `whatsapp:+[indicatif][numéro]` (ex: `whatsapp:+41779975877`).
- **Configuration du Webhook Twilio** : Dans la console Twilio (Sandbox ou numéro WhatsApp de production), configurer l'URL de réception des messages (webhook) sur :
  - `https://<domaine-du-crm>/api/v1/webhooks/whatsapp`

### 2. Ringover (CTI & Appels)

- **Création du compte** : Le client doit posséder un compte entreprise sur [Ringover](https://www.ringover.com) avec accès aux options développeurs.
- **Configuration du Webhook Ringover** : Dans le panneau de configuration Ringover, ajouter un webhook pointant vers :
  - `https://<domaine-du-crm>/api/v1/webhooks/ringover`
  - Sélectionner les événements : Début d'appel (`call_started` ou `call.started`), Fin d'appel (`call_ended` ou `call.ended`), et Appel manqué (`call_missed` ou `call.missed`).
- **Identifiant à fournir** :
  - `RINGOVER_WEBHOOK_SECRET` : Le token d'authentification généré par Ringover pour sécuriser le webhook (à configurer dans le fichier `.env` de production pour rejeter les requêtes non authentifiées).

### 3. Simulation et Tests de Téléphonie (Local)

Pour tester l'intégration Ringover et WhatsApp en local sans envoyer de vrais événements, un script de simulation est inclus :

```bash
# Simuler un appel entrant (Déclenche le pop-up CTI sur l'interface Web)
npx tsx packages/api/test-ringover.ts --event=call_started --from="+33612345678" --to="+41779975877"

# Simuler la fin de cet appel avec un enregistrement audio (Sauvegarde et met à jour le fil d'activité)
npx tsx packages/api/test-ringover.ts --event=call_ended --status=answered --duration=120 --recording="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" --from="+33612345678" --to="+41779975877"
```

Les appels simulés seront historisés dans le dossier système `Correspondances` lié aux mandats du client identifié par le numéro `from`.

> [!NOTE]
> **Synchronisation Automatique WordPress**
> Lorsque vous simulez un appel entrant d'un numéro inconnu, la pop-up CTI vous propose de "Créer le client". En validant ce formulaire, le compte du client est non seulement créé dans le CRM, mais il est également **synchronisé automatiquement sur WordPress** en arrière-plan (sans action manuelle requise). L'enregistrement audio (fichier MP3/WAV) et l'historique d'activité restent quant à eux stockés **uniquement sur le CRM**.
