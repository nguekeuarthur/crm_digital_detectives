# 📋 Passation — CRM Digital Detectives

> Créé le 16/09/2026 — À lire sur l'ordinateur de bureau avant de continuer

---

## ✅ Ce qui a été fait (session précédente)

### 1. Devis Wizard v2 — Nouveau flux en 10 étapes

Le wizard de création de devis a été entièrement refondu avec les nouvelles étapes :

| Étape | Contenu                                                                     |
| ----- | --------------------------------------------------------------------------- |
| 0     | Accueil                                                                     |
| 1     | Profil client (Particuliers / Entreprises / Autres)                         |
| 2     | Service spécifique                                                          |
| 3     | Géographie (Local / National / International)                               |
| 4     | Profil de la personne concernée (4 options)                                 |
| 5     | Environnement d'observation (sélection unique + accordéon de qualification) |
| 6     | Délai d'intervention (4 options)                                            |
| 7     | **[NOUVEAU]** Sélection des modules de prestation (A → L)                   |
| 8     | Formulaire contact                                                          |
| 10    | Résultat / Estimation                                                       |

### 2. Fichiers créés / modifiés

```
packages/website/src/data/
  ├── modules-catalog.ts          ← NOUVEAU — Catalogue des 12 modules A-L
  ├── particuliers-services.ts    ← MIS À JOUR — modules[] + 6 services "Recherche de personne"
  ├── entreprises-services.ts     ← MIS À JOUR — modules[] sur tous les services
  └── autres-services.ts          ← MIS À JOUR — modules[] sur tous les services

packages/website/src/components/
  ├── MultiSelectEnvironmentStep.tsx  ← NOUVEAU — Étape environnement (accordéon)
  └── ModuleSelectionStep.tsx         ← NOUVEAU — Étape sélection des modules A-L

packages/website/src/app/devis/
  └── page.tsx                    ← REFACTORISÉ — Nouveau flux complet

packages/website/src/types/
  └── service.ts                  ← MIS À JOUR — Champ modules?: string[] ajouté

packages/api/src/services/
  └── scoringEngine.ts            ← REFACTORISÉ — Nouveaux multiplicateurs + scoring modules
```

### 3. Mappings services → modules (source de vérité)

#### Particuliers — Recherche de preuves

| Service       | Modules          |
| ------------- | ---------------- |
| Infidélité    | A, B, G          |
| Divorce       | A, B, D, E, G    |
| Garde/Pension | A, B, D, E, F, G |
| Addictions    | A, B, E, F, G    |
| Voisinage     | A, B, F, G, I    |
| Harcèlement   | A, B, F, G, I    |

#### Particuliers — Recherche de personne

| Service                 | Modules             |
| ----------------------- | ------------------- |
| Personne disparue       | A, B, C, D, F, G, H |
| Héritiers/Bénéficiaires | A, B, C             |
| Débiteur                | A, B, C, D, E       |
| Témoins                 | B, C, H             |
| Anciens amis            | B, C, F, H          |
| Vérification d'identité | B, C, F, H          |

#### Entreprises — Menaces internes

| Service               | Modules             |
| --------------------- | ------------------- |
| Vol et fraude         | A, B, E, F, G, H, I |
| Détournement de fonds | A, B, E, F, G, H, I |
| Moralité des employés | A, B, E, G, H, I    |
| Extorsion             | A, B, J, F, G, I    |

#### Entreprises — Menaces externes

| Service               | Modules             |
| --------------------- | ------------------- |
| Concurrence déloyale  | A, B, J, F, G, I    |
| Espionnage industriel | A, B, E, F, G, H, I |
| Contrefaçons          | A, B, F, G, H, I, J |
| Enquête commerciale   | A, B, E             |

#### Autres Services

| Service                    | Modules                |
| -------------------------- | ---------------------- |
| Prévention des vols        | H, I, K, L             |
| Renseignements immobiliers | A, B, F, G, H, I       |
| Surveillance de domicile   | F, I                   |
| Protection sphère privée   | F, I                   |
| E-réputation               | A, B                   |
| Sensibilisation employés   | K, L                   |
| Collection de preuves      | A, B, D, E, F, G, H, I |

---

## 📄 Document client n°2 — Descriptions des types d'investigation

Le client a fourni les descriptions officielles de chaque module. Elles sont à utiliser pour :

- Mettre à jour les **descriptions dans `modules-catalog.ts`** (actuellement elles sont génériques)
- Potentiellement les afficher dans le step `ModuleSelectionStep.tsx` au survol des modules

### A — Mandat Admin & Numérique (on desk)

> Recherche et vérification d'informations dans les sources administratives, publiques et numériques afin d'identifier, vérifier ou documenter une personne, une situation ou un élément précis.
> _Exemples : identité, coordonnées, parcours, sociétés, informations publiques, vérifications documentaires, présence numérique._
> ⚠️ Réalisée principalement à distance, sans intervention physique.

### B — Mandat OSINT (on desk)

> Analyse et recoupement d'informations accessibles publiquement sur Internet et dans différentes sources ouvertes afin d'établir des liens, vérifier des informations ou documenter une situation.
> _Exemples : réseaux sociaux, sites Internet, publications, registres accessibles, annonces, archives._
> ⚠️ Différence avec A : l'OSINT correspond à une recherche plus approfondie basée sur le recoupement et l'analyse de nombreuses sources ouvertes.

### C — Rapport de recherche personne (on desk / on field)

> Recherche permettant de retrouver, identifier ou localiser une personne à partir des informations dont vous disposez.
> _Exemples : personne perdue de vue, débiteur, héritier, témoin, ancien contact._

### D — Recherche foncière (on desk / on field)

> Recherche permettant d'identifier des biens immobiliers, leurs propriétaires ou certains éléments liés au patrimoine foncier d'une personne ou d'une société.
> _Exemples : recherche de biens, vérification d'un patrimoine immobilier, identification d'intérêts fonciers._

### E — Audit Financier (on desk)

> Recherche d'informations permettant de mieux comprendre la situation financière ou patrimoniale d'une personne ou d'une entreprise.
> _Exemples : patrimoine, sociétés liées, activités économiques, actifs identifiables, indices de solvabilité._
> ⚠️ Formulation prudente à conserver : "informations accessibles et vérifiables" (pas de promesse d'accès à des données bancaires confidentielles).

### F — Observation statique (on field)

> Observation réalisée depuis une position déterminée afin de documenter les déplacements, comportements, rencontres ou activités d'une personne ou d'un lieu.
> _Exemples : surveillance d'un domicile, d'un lieu de travail, d'un établissement ou d'un lieu régulièrement fréquenté._
> ⚠️ L'enquêteur reste positionné sur un secteur fixe, contrairement à la filature.

### G — Filature (on field)

> Suivi discret des déplacements d'une personne afin de documenter ses trajets, lieux fréquentés, rencontres ou activités.
> _Peut être réalisée à pied ou en véhicule, peut nécessiter plusieurs enquêteurs._

### H — Contrôle externe (on field)

> Intervention sur le terrain destinée à vérifier objectivement une situation, un lieu, une activité ou certains éléments observables de l'extérieur.
> _Exemples : vérifier la présence ou l'activité d'une personne ou d'une entreprise._
> ⚠️ Vérification ciblée (pas un suivi continu).

### I — Solution technique (on field)

> Utilisation de moyens techniques adaptés à la mission afin de recueillir, documenter ou sécuriser des informations.
> ⚠️ Formulation volontairement générique — afficher un "?" dans l'UI, le prospect n'a pas besoin de savoir quel moyen sera utilisé. L'enquêteur détermine le dispositif après validation.

### J — Investigation Cyber (on desk)

> Investigation portant sur des activités, incidents ou éléments liés à l'environnement numérique.
> _Exemples : compromission de comptes, fraude numérique, usurpation, menaces en ligne._

### K — Cours en ligne (Formation)

> Formation ou sensibilisation réalisée entièrement à distance.
> ⚠️ Ce n'est pas un type d'investigation — catégorie "Formation et présentation".

### L — Cours en présentiel (Formation)

> Formation ou sensibilisation réalisée en présentiel, individuellement ou en équipe.
> ⚠️ Ce n'est pas un type d'investigation — catégorie "Formation et présentation".

---

## 🔧 Ce qui reste à faire

### Priorité 1 — Mettre à jour les descriptions dans `modules-catalog.ts`

Remplacer les descriptions génériques actuelles par les descriptions officielles du client (ci-dessus).

**Fichier :** `packages/website/src/data/modules-catalog.ts`

Pour chaque module, mettre à jour le champ `description` avec le texte du client.
Le module I doit afficher un `?` avec un texte du type _"Moyen technique adapté à votre situation — déterminé par l'enquêteur après validation."_

### Priorité 2 — Afficher les badges "on desk" / "on field" dans ModuleSelectionStep

Ajouter un badge visuel sur chaque carte de module pour indiquer si c'est une investigation à distance (🖥️ on desk) ou sur le terrain (📍 on field).

**Données à ajouter dans `modules-catalog.ts` :**

```ts
type: 'desk' | 'field' | 'both' | 'training'
// A=desk, B=desk, C=both, D=both, E=desk, F=field, G=field, H=field, I=field, J=desk, K=training, L=training
```

### Priorité 3 — Vérifier le calcul de scoring

Le `scoringEngine.ts` a été refactorisé. Il faut tester le parcours complet (choisir un service, remplir toutes les étapes, soumettre) et vérifier que l'estimation affichée est cohérente.

---

## 🚀 Comment lancer le projet

```bash
# Terminal 1 — Frontend
cd packages/website && npm run dev
# → http://localhost:3001

# Terminal 2 — Backend API
cd packages/api && npm run dev
# → http://localhost:3000

# Tester le Devis Interactif
# → http://localhost:3001/devis
```

---

## 🌿 Branche Git

Toutes les modifications sont sur la branche **`develop`**.
