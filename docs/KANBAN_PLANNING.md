# 📋 Planification Kanban — CRM Digitaldetectives

> Généré le **30 avril 2026** — basé sur les issues GitHub du dépôt [`nguekeuarthur/crm_digital_detectives`](https://github.com/nguekeuarthur/crm_digital_detectives)

---

## Légende

| Colonne         | Signification                                                     |
| --------------- | ----------------------------------------------------------------- |
| 🔵 **Backlog**  | Planifié, phase future — pas encore prête                         |
| 🟡 **À faire**  | Phase active — prêt à démarrer                                    |
| 🟠 **En cours** | Travail en cours (affectez une issue ici quand vous la commencez) |
| 🟣 **En revue** | PR ouverte, en attente de code review                             |
| ✅ **Terminé**  | Mergé et validé                                                   |

### Labels

| Icône | Label        | Domaine                           |
| ----- | ------------ | --------------------------------- |
| 🔷    | `backend`    | API / Node.js                     |
| 🟩    | `frontend`   | React / Vite                      |
| 🟪    | `infra`      | Infrastructure / Config           |
| 🧪    | `test`       | Tests unitaires, intégration, e2e |
| 📄    | `doc`        | Documentation                     |
| 🤖    | `ia`         | Intelligence artificielle         |
| 🔒    | `conformite` | RGPD / LPD / Sécurité des données |

---

## 🏗️ Phase 1 — Fondations _(no milestone — améliorations structurelles)_

> Issues transverses : migration TypeScript et architecture frontend FSD.

| #                                                                          | Titre                                                             | Label                  | Colonne    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------- | ---------- |
| [#140](https://github.com/nguekeuarthur/crm_digital_detectives/issues/140) | Migration monorepo en TypeScript                                  | 🟪 infra               | 🟡 À faire |
| [#141](https://github.com/nguekeuarthur/crm_digital_detectives/issues/141) | Mise en place architecture FSD (Feature-Sliced Design) — Frontend | 🟩 frontend · 🟪 infra | 🟡 À faire |

---

## ⚙️ Phase 2 — Setup & Architecture

> **Deadline : 11 mai 2026** — Environnement de développement opérationnel, schéma BDD validé et documenté.

| #                                                                        | Titre                                                     | Label       | Colonne    |
| ------------------------------------------------------------------------ | --------------------------------------------------------- | ----------- | ---------- |
| [#72](https://github.com/nguekeuarthur/crm_digital_detectives/issues/72) | Modèle de données : Clients, Mandats, Utilisateurs, Rôles | 🔷 backend  | 🟡 À faire |
| [#73](https://github.com/nguekeuarthur/crm_digital_detectives/issues/73) | Modèle de données : Dossiers, Preuves, Sous-traitants     | 🔷 backend  | 🟡 À faire |
| [#74](https://github.com/nguekeuarthur/crm_digital_detectives/issues/74) | Modèle de données : Devis, Contrats, Paiements            | 🔷 backend  | 🟡 À faire |
| [#75](https://github.com/nguekeuarthur/crm_digital_detectives/issues/75) | Configurer l'API REST Express + structure des routes      | 🔷 backend  | 🟡 À faire |
| [#76](https://github.com/nguekeuarthur/crm_digital_detectives/issues/76) | Scaffolding React (Vite) + React Router + Zustand         | 🟩 frontend | 🟡 À faire |
| [#77](https://github.com/nguekeuarthur/crm_digital_detectives/issues/77) | CI/CD GitHub Actions (lint + test + build)                | 🟪 infra    | 🟡 À faire |
| [#78](https://github.com/nguekeuarthur/crm_digital_detectives/issues/78) | Documentation architecture (README + ADR)                 | 📄 doc      | 🟡 À faire |

### Flux de dépendances Phase 2

```
#72 ──► #75 ──► (Phase 3 - Auth)
#73 ──┘
#74 ──┘
#76 ──► (Phase 3 - UI)
#77 ──► (toutes les phases)
#78 ──► (toutes les phases)
```

---

## 🔐 Phase 3 — Auth, Clients & Mandats

> **Deadline : 8 juin 2026** — Authentification sécurisée (RBAC + 2FA), module clients/mandats fonctionnel et synchronisé avec WordPress.

| #                                                                        | Titre                                                               | Label       | Colonne    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------- | ---------- |
| [#79](https://github.com/nguekeuarthur/crm_digital_detectives/issues/79) | Système d'authentification JWT + refresh tokens                     | 🔷 backend  | 🔵 Backlog |
| [#80](https://github.com/nguekeuarthur/crm_digital_detectives/issues/80) | Gestion des rôles : admin, enquêteur, sous-traitant temporaire      | 🔷 backend  | 🔵 Backlog |
| [#81](https://github.com/nguekeuarthur/crm_digital_detectives/issues/81) | Middleware d'autorisation par rôle sur toutes les routes            | 🔷 backend  | 🔵 Backlog |
| [#82](https://github.com/nguekeuarthur/crm_digital_detectives/issues/82) | Authentification forte (2FA TOTP)                                   | 🔷 backend  | 🔵 Backlog |
| [#83](https://github.com/nguekeuarthur/crm_digital_detectives/issues/83) | UI : page de login + gestion des sessions côté React                | 🟩 frontend | 🔵 Backlog |
| [#84](https://github.com/nguekeuarthur/crm_digital_detectives/issues/84) | Journalisation complète des actions utilisateur (audit log)         | 🔷 backend  | 🔵 Backlog |
| [#85](https://github.com/nguekeuarthur/crm_digital_detectives/issues/85) | Tests unitaires authentification (Jest)                             | 🧪 test     | 🔵 Backlog |
| [#86](https://github.com/nguekeuarthur/crm_digital_detectives/issues/86) | API CRUD clients (création, lecture, mise à jour, suppression)      | 🔷 backend  | 🔵 Backlog |
| [#87](https://github.com/nguekeuarthur/crm_digital_detectives/issues/87) | API CRUD mandats avec statuts et avancement                         | 🔷 backend  | 🔵 Backlog |
| [#88](https://github.com/nguekeuarthur/crm_digital_detectives/issues/88) | Détection automatique des doublons clients                          | 🔷 backend  | 🔵 Backlog |
| [#89](https://github.com/nguekeuarthur/crm_digital_detectives/issues/89) | Import WordPress via API REST WP (synchronisation bidirectionnelle) | 🔷 backend  | 🔵 Backlog |
| [#90](https://github.com/nguekeuarthur/crm_digital_detectives/issues/90) | UI : liste clients avec filtres, tri et recherche                   | 🟩 frontend | 🔵 Backlog |
| [#91](https://github.com/nguekeuarthur/crm_digital_detectives/issues/91) | UI : fiche client complète + historique                             | 🟩 frontend | 🔵 Backlog |
| [#92](https://github.com/nguekeuarthur/crm_digital_detectives/issues/92) | UI : tableau de bord mandats + kanban statuts                       | 🟩 frontend | 🔵 Backlog |
| [#93](https://github.com/nguekeuarthur/crm_digital_detectives/issues/93) | Champs personnalisables (custom fields) par mandat                  | 🔷 backend  | 🔵 Backlog |

### Flux de dépendances Phase 3

```
#79 ──► #80 ──► #81
              ──► #85 (tests)
#79 ──► #82
#79 ──► #83 (UI login)
#86 ──► #88 (doublons)
       ──► #89 (WP sync)
       ──► #90 / #91 (UI)
#87 ──► #92 (UI kanban)
       ──► #93 (custom fields)
#84 (audit log — transversal)
```

---

## 📁 Phase 4 — Dossiers, Preuves & Sous-traitants

> **Deadline : 6 juillet 2026** — Gestion documentaire et preuves opérationnelle, sous-traitants gérés, devis PDF générables.

| #                                                                          | Titre                                                                   | Label       | Colonne    |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------- | ---------- |
| [#94](https://github.com/nguekeuarthur/crm_digital_detectives/issues/94)   | Génération automatique d'arborescence dossier à la création mandat      | 🔷 backend  | 🔵 Backlog |
| [#95](https://github.com/nguekeuarthur/crm_digital_detectives/issues/95)   | API upload fichiers (photos, vidéos, docs) avec stockage Infomaniak     | 🔷 backend  | 🔵 Backlog |
| [#96](https://github.com/nguekeuarthur/crm_digital_detectives/issues/96)   | Extraction et conservation des métadonnées EXIF (géolocalisation, date) | 🔷 backend  | 🔵 Backlog |
| [#97](https://github.com/nguekeuarthur/crm_digital_detectives/issues/97)   | Intégration Nikon Cloud → import automatique vers dossier mandat        | 🔷 backend  | 🔵 Backlog |
| [#98](https://github.com/nguekeuarthur/crm_digital_detectives/issues/98)   | UI : explorateur de dossiers et fichiers par mandat                     | 🟩 frontend | 🔵 Backlog |
| [#99](https://github.com/nguekeuarthur/crm_digital_detectives/issues/99)   | UI : visionneuse preuves avec métadonnées EXIF affichées                | 🟩 frontend | 🔵 Backlog |
| [#100](https://github.com/nguekeuarthur/crm_digital_detectives/issues/100) | Fil d'activité chronologique par mandat                                 | 🔷 backend  | 🔵 Backlog |
| [#101](https://github.com/nguekeuarthur/crm_digital_detectives/issues/101) | API gestion sous-traitants + accès temporaires                          | 🔷 backend  | 🔵 Backlog |
| [#102](https://github.com/nguekeuarthur/crm_digital_detectives/issues/102) | Affectation sous-traitant à un mandat + suivi des heures                | 🔷 backend  | 🔵 Backlog |
| [#103](https://github.com/nguekeuarthur/crm_digital_detectives/issues/103) | Pré-calcul facturation freelances                                       | 🔷 backend  | 🔵 Backlog |
| [#104](https://github.com/nguekeuarthur/crm_digital_detectives/issues/104) | Catalogue prestations (import Excel + CRUD)                             | 🔷 backend  | 🔵 Backlog |
| [#105](https://github.com/nguekeuarthur/crm_digital_detectives/issues/105) | Générateur de devis avec système panier + calcul des marges             | 🔷 backend  | 🔵 Backlog |
| [#106](https://github.com/nguekeuarthur/crm_digital_detectives/issues/106) | Génération PDF devis (Puppeteer ou PDFKit) + envoi email automatique    | 🔷 backend  | 🔵 Backlog |
| [#107](https://github.com/nguekeuarthur/crm_digital_detectives/issues/107) | UI : gestion catalogue et interface de création de devis                | 🟩 frontend | 🔵 Backlog |
| [#108](https://github.com/nguekeuarthur/crm_digital_detectives/issues/108) | Historique et traçabilité de tous les devis                             | 🔷 backend  | 🔵 Backlog |

### Flux de dépendances Phase 4

```
#94 (arborescence) ──► #95 (upload) ──► #96 (EXIF) ──► #97 (Nikon)
                                     ──► #98 (UI explorateur)
                                         ──► #99 (UI visionneuse EXIF)
#101 (sous-traitants) ──► #102 (heures) ──► #103 (facturation)
#104 (catalogue) ──► #105 (devis) ──► #106 (PDF) ──► #107 (UI devis)
                                                   ──► #108 (historique)
#100 (activité — transversal, alimenté par tous les modules)
```

---

## 📡 Phase 5 — Communication, Paiements & Contrats

> **Deadline : 3 août 2026** — Communications multi-canaux centralisées, paiements suivis, contrats signés électroniquement.

| #                                                                          | Titre                                                                        | Label       | Colonne    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- | ---------- |
| [#109](https://github.com/nguekeuarthur/crm_digital_detectives/issues/109) | Connexion boîte email IMAP/SMTP (Nodemailer + IMAP)                          | 🔷 backend  | 🔵 Backlog |
| [#110](https://github.com/nguekeuarthur/crm_digital_detectives/issues/110) | Synchronisation bidirectionnelle emails ↔ fiche client                       | 🔷 backend  | 🔵 Backlog |
| [#111](https://github.com/nguekeuarthur/crm_digital_detectives/issues/111) | Envoi automatique emails : confirmation, relance, notification               | 🔷 backend  | 🔵 Backlog |
| [#112](https://github.com/nguekeuarthur/crm_digital_detectives/issues/112) | Intégration Ringover (CTI : affichage fiche client à l'appel entrant)        | 🔷 backend  | 🔵 Backlog |
| [#113](https://github.com/nguekeuarthur/crm_digital_detectives/issues/113) | Enregistrement et archivage des appels téléphoniques                         | 🔷 backend  | 🔵 Backlog |
| [#114](https://github.com/nguekeuarthur/crm_digital_detectives/issues/114) | Intégration WhatsApp (Twilio ou 360dialog) + historisation des messages      | 🔷 backend  | 🔵 Backlog |
| [#115](https://github.com/nguekeuarthur/crm_digital_detectives/issues/115) | UI : onglet communication centralisée dans la fiche client                   | 🟩 frontend | 🔵 Backlog |
| [#116](https://github.com/nguekeuarthur/crm_digital_detectives/issues/116) | Résumés IA des échanges email, appels et WhatsApp (Claude API, conforme LPD) | 🤖 ia       | 🔵 Backlog |
| [#117](https://github.com/nguekeuarthur/crm_digital_detectives/issues/117) | Module paiements : suivi, rapprochement mandat, relances automatiques        | 🔷 backend  | 🔵 Backlog |
| [#118](https://github.com/nguekeuarthur/crm_digital_detectives/issues/118) | Intégration Stripe et Mollie (webhooks paiement)                             | 🔷 backend  | 🔵 Backlog |
| [#119](https://github.com/nguekeuarthur/crm_digital_detectives/issues/119) | Connexion compte bancaire lecture seule (API bancaire ou Bexio)              | 🔷 backend  | 🔵 Backlog |
| [#120](https://github.com/nguekeuarthur/crm_digital_detectives/issues/120) | Dashboard finance : reçus, manquants, relances, devis et factures            | 🟩 frontend | 🔵 Backlog |
| [#121](https://github.com/nguekeuarthur/crm_digital_detectives/issues/121) | Module contrats : génération depuis modèles avec variables dynamiques        | 🔷 backend  | 🔵 Backlog |
| [#122](https://github.com/nguekeuarthur/crm_digital_detectives/issues/122) | Intégration signature électronique (Dropbox Sign ou Usign)                   | 🔷 backend  | 🔵 Backlog |
| [#123](https://github.com/nguekeuarthur/crm_digital_detectives/issues/123) | Archivage automatique du contrat signé dans la fiche mandat                  | 🔷 backend  | 🔵 Backlog |
| [#124](https://github.com/nguekeuarthur/crm_digital_detectives/issues/124) | UI : gestion des contrats et workflow de signature                           | 🟩 frontend | 🔵 Backlog |

### Flux de dépendances Phase 5

```
#109 ──► #110 ──► #111
              ──► #115 (UI comm)
#112 ──► #113 ──► #115
#114 ──► #115
#115 (UI) ──► #116 (IA résumés)

#117 ──► #118 (Stripe/Mollie)
       ──► #119 (banque)
       ──► #120 (dashboard finance)

#121 (contrats) ──► #122 (signature) ──► #123 (archivage) ──► #124 (UI)
```

---

## 🤖 Phase 6 — IA, Conformité & Livraison

> **Deadline : 27 août 2026** — IA opérationnelle, conformité RGPD/LPD vérifiée, CRM livré et déployé chez Digitaldetectives.

| #                                                                          | Titre                                                                    | Label         | Colonne    |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------- | ---------- |
| [#125](https://github.com/nguekeuarthur/crm_digital_detectives/issues/125) | Suppression automatique des données (30/60/90j) — conformité LPD         | 🔒 conformite | 🔵 Backlog |
| [#126](https://github.com/nguekeuarthur/crm_digital_detectives/issues/126) | Résumés IA audio des appels téléphoniques (Whisper API)                  | 🤖 ia         | 🔵 Backlog |
| [#127](https://github.com/nguekeuarthur/crm_digital_detectives/issues/127) | Suggestions automatiques de tâches et de relances (IA)                   | 🤖 ia         | 🔵 Backlog |
| [#128](https://github.com/nguekeuarthur/crm_digital_detectives/issues/128) | Classement automatique des documents par typologie (IA)                  | 🤖 ia         | 🔵 Backlog |
| [#129](https://github.com/nguekeuarthur/crm_digital_detectives/issues/129) | Export des données sur demande (conformité RGPD et LPD)                  | 🔒 conformite | 🔵 Backlog |
| [#130](https://github.com/nguekeuarthur/crm_digital_detectives/issues/130) | Système de sauvegarde automatisé (cron + Infomaniak)                     | 🟪 infra      | 🔵 Backlog |
| [#131](https://github.com/nguekeuarthur/crm_digital_detectives/issues/131) | Tests d'intégration end-to-end (Playwright)                              | 🧪 test       | 🔵 Backlog |
| [#132](https://github.com/nguekeuarthur/crm_digital_detectives/issues/132) | Hardening sécurité (rate limiting, CSRF, headers HTTP, OWASP Top 10)     | 🟪 infra      | 🔵 Backlog |
| [#133](https://github.com/nguekeuarthur/crm_digital_detectives/issues/133) | Documentation technique complète (API Swagger + architecture)            | 📄 doc        | 🔵 Backlog |
| [#134](https://github.com/nguekeuarthur/crm_digital_detectives/issues/134) | Documentation fonctionnelle utilisateur                                  | 📄 doc        | 🔵 Backlog |
| [#135](https://github.com/nguekeuarthur/crm_digital_detectives/issues/135) | Guide de déploiement Infomaniak (Docker + CI/CD)                         | 📄 doc        | 🔵 Backlog |
| [#136](https://github.com/nguekeuarthur/crm_digital_detectives/issues/136) | Tests de charge et optimisation des requêtes base de données             | 🧪 test       | 🔵 Backlog |
| [#137](https://github.com/nguekeuarthur/crm_digital_detectives/issues/137) | Préparation architecture web app future (API versioning + extensibilité) | 🟪 infra      | 🔵 Backlog |
| [#138](https://github.com/nguekeuarthur/crm_digital_detectives/issues/138) | Recette finale avec Digitaldetectives + corrections                      | 🟪 infra      | 🔵 Backlog |
| [#139](https://github.com/nguekeuarthur/crm_digital_detectives/issues/139) | 🚀 Livraison officielle v1.0 — CRM Digitaldetectives                     | milestone     | 🔵 Backlog |

### Flux de dépendances Phase 6

```
#126 / #127 / #128 (IA) ──► (dépendent des données des phases 3, 4, 5)
#125 / #129 (conformité) ──► (transversal — vérifier avant #138)
#130 (backup) ──► #132 (hardening) ──► #131 (tests e2e) ──► #136 (perf)
#133 / #134 / #135 (docs) ──► #138 (recette) ──► #139 (livraison)
```

---

## 📊 Récapitulatif global

| Phase                                | Issues | Backend | Frontend | Infra | Test  | Doc   | IA    | Conformité | Deadline       |
| ------------------------------------ | ------ | ------- | -------- | ----- | ----- | ----- | ----- | ---------- | -------------- |
| Phase 1 — Fondations                 | 2      | —       | 1        | 2     | —     | —     | —     | —          | (continu)      |
| Phase 2 — Setup & Architecture       | 7      | 4       | 1        | 1     | —     | 1     | —     | —          | 11 mai 2026    |
| Phase 3 — Auth, Clients & Mandats    | 15     | 10      | 4        | —     | 1     | —     | —     | —          | 8 juin 2026    |
| Phase 4 — Dossiers, Preuves & ST     | 15     | 12      | 3        | —     | —     | —     | —     | —          | 6 juillet 2026 |
| Phase 5 — Communication, Paiements   | 16     | 11      | 3        | —     | —     | —     | 1     | —          | 3 août 2026    |
| Phase 6 — IA, Conformité & Livraison | 15     | —       | —        | 4     | 2     | 3     | 3     | 2          | 27 août 2026   |
| **Total**                            | **70** | **37**  | **12**   | **7** | **3** | **4** | **4** | **2**      |                |

---

## 🗂️ Vue Kanban transversale (par colonne)

### 🟡 À faire — Sprint actif (Phase 2, deadline : 11 mai 2026)

| #    | Titre                                                     | Label                  |
| ---- | --------------------------------------------------------- | ---------------------- |
| #140 | Migration monorepo en TypeScript                          | 🟪 infra               |
| #141 | Mise en place architecture FSD — Frontend                 | 🟩 frontend · 🟪 infra |
| #72  | Modèle de données : Clients, Mandats, Utilisateurs, Rôles | 🔷 backend             |
| #73  | Modèle de données : Dossiers, Preuves, Sous-traitants     | 🔷 backend             |
| #74  | Modèle de données : Devis, Contrats, Paiements            | 🔷 backend             |
| #75  | Configurer l'API REST Express + structure des routes      | 🔷 backend             |
| #76  | Scaffolding React (Vite) + React Router + Zustand         | 🟩 frontend            |
| #77  | CI/CD GitHub Actions (lint + test + build)                | 🟪 infra               |
| #78  | Documentation architecture (README + ADR)                 | 📄 doc                 |

### 🔵 Backlog — Phases 3 à 6 (61 issues)

> Toutes les issues des phases 3, 4, 5 et 6 listées ci-dessus.

---

_Mise à jour de ce fichier à chaque début de phase — déplacez les issues dans les colonnes Kanban correspondantes au fil de l'avancement._
