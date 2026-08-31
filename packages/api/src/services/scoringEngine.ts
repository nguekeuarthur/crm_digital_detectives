export interface ScoringAnswers {
  geo: string;
  target: string;
  environment: string;
  logistics: string;
}

export const MODULE_BASE_SCORES: Record<string, number> = {
  // Particuliers
  'infidelite': 800,
  'divorce': 1000,
  'garde-pension': 1200,
  'addictions': 600,
  'voisinage': 500,
  'harcelement': 1500,

  // Entreprises
  'vol-fraude': 1300,
  'detournement': 2000,
  'moralite-employes': 900,
  'extorsion-interne': 2500,
  'concurrence': 3000,
  'espionnage': 5000,
  'contrefacon': 1800,
  'enquete-commerciale': 1200,

  // Autres Services
  'prevention-vols': 700,
  'renseignements-immobiliers': 800,
  'surveillance-domicile': 900,
  'protection-privee': 2000,
  'e-reputation': 1500,
  'sensibilisation': 500,
};

export const MULTIPLIERS = {
  geo: {
    'local': 1.0,
    'national': 1.3,
    'international': 1.8
  },
  target: {
    'simple': 1.0,
    'protected': 1.5,
    'public_figure': 1.8
  },
  environment: {
    'urban': 1.0,
    'rural': 1.2,
    'hostile': 1.4
  },
  logistics: {
    'standard': 1.0,
    'complex': 1.4,
    'extreme': 1.8
  }
};

export const calculateComplexityScore = (modules: string[], answers: ScoringAnswers): number => {
  let baseScore = 0;
  for (const mod of modules) {
    if (MODULE_BASE_SCORES[mod]) {
      baseScore += MODULE_BASE_SCORES[mod];
    } else {
      baseScore += 1000; // Fallback par défaut si non trouvé
    }
  }

  const mGeo = MULTIPLIERS.geo[answers.geo as keyof typeof MULTIPLIERS.geo] || 1.0;
  const mTarget = MULTIPLIERS.target[answers.target as keyof typeof MULTIPLIERS.target] || 1.0;
  const mEnv = MULTIPLIERS.environment[answers.environment as keyof typeof MULTIPLIERS.environment] || 1.0;
  const mLog = MULTIPLIERS.logistics[answers.logistics as keyof typeof MULTIPLIERS.logistics] || 1.0;

  return baseScore * mGeo * mTarget * mEnv * mLog;
};
