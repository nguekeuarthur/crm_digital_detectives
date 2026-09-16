# Rapport de Sécurité et Audit OWASP - CRM Digitaldetectives

Ce document présente l'audit et les mesures de durcissement (hardening) de sécurité implémentées dans le cadre de la conformité LPD (Loi suisse sur la protection des données) et RGPD.

## 1. Mesures de Durcissement de la Sécurité (OWASP)

### A. Middleware Helmet (En-têtes HTTP de Sécurité)

Nous utilisons `helmet` pour configurer les en-têtes HTTP sécurisés afin de prévenir les attaques courantes comme le détournement de clic (clickjacking), le sniffing de type MIME et l'injection de scripts.

- **Content Security Policy (CSP)** : Configure une politique stricte restreignant l'exécution de scripts et le chargement de styles aux sources autorisées (`'self'`), interdisant ainsi les scripts tiers arbitraires.
- **HTTP Strict Transport Security (HSTS)** : Configuré pour 1 an (`maxAge: 31536000`), avec inclusion des sous-domaines et option `preload`, forçant les navigateurs à utiliser uniquement HTTPS.
- **X-Frame-Options** : Défini à `DENY` via Helmet pour rejeter tout chargement dans un `<iframe>` et neutraliser le détournement de clic.
- **X-Content-Type-Options** : Positionné à `nosniff` pour éviter toute exécution détournée de fichiers médias en tant que scripts.

### B. Protection contre les attaques CSRF (Double Submit Cookie)

Pour sécuriser les requêtes d'écriture (POST, PUT, DELETE, PATCH) sans dépendre de sessions stockées côté serveur, nous avons implémenté le pattern **Double Submit Cookie** :

1. **Génération du Jeton** : À chaque requête, si aucun jeton n'existe, le middleware `csrfProtection` en génère un cryptographiquement sûr (`crypto.randomBytes(32)`).
2. **Double Envoi** :
   - Le jeton est écrit dans un cookie accessible au client (SameSite: `strict`, Secure en production).
   - Le client lit le cookie et l'ajoute dans l'en-tête HTTP `X-CSRF-Token` lors de ses requêtes de modification.
3. **Vérification** : Le middleware valide que le jeton reçu dans l'en-tête correspond exactement à celui du cookie. En cas de divergence, la requête est rejetée avec un code HTTP `403 Forbidden`.
4. **Exclusions contrôlées** : Les requêtes GET/OPTIONS/HEAD/TRACE ainsi que les webhooks externes sécurisés par signature (`/api/v1/webhooks`) sont exemptés de cette vérification.

### C. Assainissement des entrées contre le XSS (Cross-Site Scripting)

Toutes les entrées utilisateurs (`req.body`, `req.query`, `req.params`) passent par le middleware `xssSanitizer`.

- Ce middleware nettoie récursivement tous les objets reçus en encodant les caractères spéciaux HTML critiques :
  - `<` devient `&lt;`
  - `>` devient `&gt;`
  - `"` devient `&quot;`
  - `'` devient `&#x27;`
  - `/` devient `&#x2F;`
- Cela évite l'injection de balises `<script>` ou d'attributs malveillants (`onload`, `onerror`) dans la base de données.

### D. Redirection HTTPS Systématique

En environnement de production (`NODE_ENV === 'production'`), toutes les requêtes HTTP non chiffrées sont automatiquement redirigées vers HTTPS en utilisant le protocole détecté via l'en-tête `x-forwarded-proto` (provenant du reverse-proxy ou de l'ingress).

---

## 2. Conformité LPD & RGPD : Cycle de vie et Rétention des Données

### A. Politique de Rétention (LPD/RGPD)

Les données d'enquête et les informations des clients inactifs ne doivent pas être conservées indéfiniment.
Le module `RetentionService` gère ces cycles de vie :

- **Configuration** : Les administrateurs définissent des règles globales de rétention par type d'entité (`MANDATE_CLOSED` ou `CLIENT_INACTIVE`), exprimées en jours.
- **Spécificités** : Les mandats individuels peuvent définir une durée de conservation sur-mesure (`retentionDays`) qui outrepasse la règle globale.
- **Rapport de Rétention** : L'URL `/api/v1/admin/retention-report` génère un rapport planifiant les futures suppressions ou anonymisations de données.
- **Pré-notification J-7** : Une tâche cron quotidienne appelle `sendWarnings()`. Sept jours avant la purge effective d'une donnée, un e-mail consolidé d'avertissement est envoyé à tous les administrateurs pour leur permettre d'ajuster le délai si nécessaire. Un audit log `RETENTION_WARNING_SENT` garantit qu'aucune notification en doublon n'est envoyée pour une même entité.
- **Purge/Anonymisation automatique** : Une tâche cron déclenche la purge quotidienne des données échues :
  - **Suppression (DELETE)** : Suppression définitive du mandat, de ses activités, de ses devis, de ses time entries, et suppression physique des pièces jointes chiffrées associées.
  - **Anonymisation (ANONYMIZE)** : Remplacement des données personnelles d'un client par des valeurs pseudonymisées (ex: `Anon-xxxx`, `anon-xxxx@digitaldetectives-anon.ch`) et déconnexion complète de l'identifiant WordPress (`wpId: null`). Les pièces jointes associées sont également détruites pour supprimer les preuves.

---

## 3. Portabilité des Données (Export Asynchrone)

Afin de respecter le droit à la portabilité (Article 20 RGPD et Article 28 LPD), les utilisateurs (hors sous-traitants) peuvent demander un export complet de leurs données :

- **Traitement Asynchrone** : Pour éviter les timeouts HTTP (limite de 2 minutes), l'exportation s'effectue en arrière-plan via `archiver`.
- **Déchiffrement à la volée** : Le service récupère les pièces jointes chiffrées et les déchiffre à la volée avant de les ajouter au fichier ZIP pour que l'export transmis au client soit exploitable sans surcouche logicielle.
- **Partage Sécurisé** : Un lien temporaire JWT d'une validité de 24 heures est généré avec une clé secrète et envoyé par e-mail au demandeur.
- **Nettoyage automatique** : Un cron job quotidien supprime automatiquement les fichiers ZIP du dossier `uploads/exports` dès qu'ils dépassent 24 heures d'ancienneté.

---

## 4. Preuve de Conformité (Audit Trail)

Chaque action sensible (suppressions automatiques, anonymisation, modification de configuration de rétention, demandes d'export global ou spécifique) fait l'objet d'une journalisation dans la table `AuditLog` avec l'action, l'entité ciblée, et les anciennes/nouvelles valeurs. Ces logs d'audit servent de preuve indiscutable en cas de contrôle de conformité.

---

## 5. Audit des Dépendances (NPM Audit)

Un scan de vulnérabilité a été exécuté sur les dépendances du projet (`npm audit`). Conformément aux critères d'acceptation, **aucune vulnérabilité de sévérité HIGH ou CRITICAL n'est présente dans le projet**.
Les éventuels avertissements restants concernent exclusivement des dépendances de développement (ex: `esbuild` de sévérité MODERATE) qui n'impactent pas la sécurité de l'application en production.
