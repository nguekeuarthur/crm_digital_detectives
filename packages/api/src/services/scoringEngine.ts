export interface EnvQualification {
  adresse?: string;      // connue | approximative | inconnue
  type?: string;         // maison | immeuble | residence_securisee | bureau | ...
  environnement?: string; // urbain | residentiel | rural
  accessibilite?: string; // facile | moderee | difficile
  precision?: string;
  frequence?: string;
  description?: string;
}

export interface ScoringAnswers {
  geo: string;
  target: string;            // accessible | discret | tres_discret | indetermine
  delai: string;             // standard | urgent | tres_urgent | je_ne_sais_pas
  environments?: string[];   // lieux sélectionnés
  envQualifications?: Record<string, EnvQualification>;
  selectedModules?: string[]; // modules A-L choisis par le client
  // Rétrocompatibilité
  environment?: string;
  logistics?: string;
}

export const MODULE_BASE_SCORES: Record<string, number> = {
  // ── Particuliers — Recherche de preuves ──
  "infidelite":           800,
  "divorce":              1000,
  "garde-pension":        1200,
  "addictions":           600,
  "voisinage":            500,
  "harcelement":          1500,

  // ── Particuliers — Recherche de personne ──
  "personne-disparue":    1800,
  "heritiers":            900,
  "debiteur":             1100,
  "temoins":              700,
  "anciens-amis":         600,
  "verification-identite":800,

  // ── Entreprises — Menaces internes ──
  "vol-fraude":           1300,
  "detournement":         2000,
  "moralite-employes":    900,
  "extorsion-interne":    2500,

  // ── Entreprises — Menaces externes ──
  "concurrence":          3000,
  "espionnage":           5000,
  "contrefacon":          1800,
  "enquete-commerciale":  1200,

  // ── Autres Services ──
  "prevention-vols":          700,
  "renseignements-immobiliers":800,
  "surveillance-domicile":    900,
  "protection-privee":        2000,
  "e-reputation":             1500,
  "sensibilisation":          500,
  "collection-preuve":        2200,
};

// Poids de chaque module (contribution relative au score)
export const MODULE_WEIGHTS: Record<string, number> = {
  A: 1.0,   // Mandat Admin & Numérique
  B: 1.2,   // Mandat OSINT
  C: 1.3,   // Rapport de recherche personne
  D: 1.4,   // Recherche foncière
  E: 1.8,   // Audit Financier
  F: 1.3,   // Observation statique
  G: 1.6,   // Filature
  H: 1.2,   // Contrôle externe
  I: 2.0,   // Solution technique
  J: 2.5,   // Mandat Cyber
  K: 0.8,   // Cours en ligne
  L: 1.0,   // Cours en présentiel
};

export const MULTIPLIERS = {
  geo: {
    local:         1.0,
    national:      1.3,
    international: 1.8,
  },
  target: {
    // Nouveaux IDs (document client v2)
    accessible:    1.0,
    tres_discret:  1.8,
    discret:       1.4,
    indetermine:   1.2,
    // Rétrocompatibilité anciens IDs
    simple:        1.0,
    protected:     1.5,
    public_figure: 1.8,
  },
  delai: {
    // Nouveaux IDs (document client v2)
    standard:       1.0,
    urgent:         1.3,
    tres_urgent:    1.6,
    je_ne_sais_pas: 1.0,
    // Rétrocompatibilité anciens IDs
    complex:  1.4,
    extreme:  1.8,
  },
  environment: {
    // Anciens IDs (rétrocompatibilité)
    urban:   1.0,
    rural:   1.2,
    hostile: 1.4,
  },
};

// Calcule un multiplicateur d'environnement à partir des lieux sélectionnés
const calculateEnvMultiplier = (
  environments: string[],
  qualifications: Record<string, EnvQualification>
): number => {
  if (!environments || environments.length === 0) return 1.0;
  if (environments.includes("je_ne_sais_pas")) return 1.1;

  let totalMultiplier = 1.0;

  // Plus il y a de lieux → plus c'est complexe
  const nbLieux = environments.filter((e) => e !== "je_ne_sais_pas").length;
  totalMultiplier += (nbLieux - 1) * 0.1; // +10% par lieu supplémentaire

  // Qualification de chaque lieu
  for (const envId of environments) {
    const qual = qualifications?.[envId];
    if (!qual) continue;

    // Adresse
    if (qual.adresse === "inconnue") totalMultiplier += 0.3;
    else if (qual.adresse === "approximative") totalMultiplier += 0.1;

    // Type de logement/lieu
    if (qual.type === "residence_securisee") totalMultiplier += 0.2;
    else if (qual.type === "immeuble") totalMultiplier += 0.05;

    // Accessibilité
    if (qual.accessibilite === "difficile") totalMultiplier += 0.15;
    else if (qual.accessibilite === "moderee") totalMultiplier += 0.05;
  }

  return Math.min(totalMultiplier, 3.0); // Cap à 3x
};

export const calculateComplexityScore = (
  modules: string[],
  answers: ScoringAnswers
): number => {
  // ── 1. Score de base selon le service ──
  let baseScore = 0;
  for (const mod of modules) {
    if (MODULE_BASE_SCORES[mod]) {
      baseScore += MODULE_BASE_SCORES[mod];
    } else {
      baseScore += 1000; // Fallback par défaut
    }
  }

  // ── 2. Bonus selon les modules sélectionnés ──
  if (answers.selectedModules && answers.selectedModules.length > 0) {
    const modulesBonus = answers.selectedModules.reduce((acc, moduleCode) => {
      return acc + (MODULE_WEIGHTS[moduleCode] || 1.0) * 150;
    }, 0);
    baseScore += modulesBonus;
  }

  // ── 3. Multiplicateurs contextuels ──
  const mGeo =
    MULTIPLIERS.geo[answers.geo as keyof typeof MULTIPLIERS.geo] || 1.0;

  const mTarget =
    MULTIPLIERS.target[answers.target as keyof typeof MULTIPLIERS.target] || 1.0;

  // Délai (nouveau) ou logistique (ancien)
  const delaiKey = answers.delai || answers.logistics || "standard";
  const mDelai =
    MULTIPLIERS.delai[delaiKey as keyof typeof MULTIPLIERS.delai] || 1.0;

  // Environnement : multi-lieu (nouveau) ou single (ancien)
  let mEnv = 1.0;
  if (answers.environments && answers.environments.length > 0) {
    mEnv = calculateEnvMultiplier(
      answers.environments,
      answers.envQualifications || {}
    );
  } else if (answers.environment) {
    mEnv =
      MULTIPLIERS.environment[
        answers.environment as keyof typeof MULTIPLIERS.environment
      ] || 1.0;
  }

  const finalScore = baseScore * mGeo * mTarget * mEnv * mDelai;
  return Math.round(finalScore / 50) * 50; // Arrondi à 50 CHF près
};
