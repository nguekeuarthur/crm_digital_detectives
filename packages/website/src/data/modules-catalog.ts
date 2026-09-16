export interface Module {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
  priceWeight: number; // Poids relatif pour le scoring (1 = base)
}

export const MODULE_CATALOG: Record<string, Module> = {
  A: {
    id: "A",
    label: "Mandat Admin & Numérique",
    description: "Ouverture de dossier, frais administratifs et gestion numérique du mandat.",
    icon: "FileText",
    priceWeight: 1.0,
  },
  B: {
    id: "B",
    label: "Mandat OSINT",
    description: "Renseignements en sources ouvertes : réseaux sociaux, bases de données publiques, web.",
    icon: "Search",
    priceWeight: 1.2,
  },
  C: {
    id: "C",
    label: "Rapport de recherche personne",
    description: "Dossier complet et documenté sur la localisation et l'identification d'une personne.",
    icon: "FileSearch",
    priceWeight: 1.3,
  },
  D: {
    id: "D",
    label: "Recherche foncière",
    description: "Identification et vérification de biens immobiliers, propriétés et actifs fonciers.",
    icon: "Home",
    priceWeight: 1.4,
  },
  E: {
    id: "E",
    label: "Audit Financier",
    description: "Analyse de situation financière, revenus, comptes, patrimoine et flux monétaires.",
    icon: "BarChart2",
    priceWeight: 1.8,
  },
  F: {
    id: "F",
    label: "Observation statique",
    description: "Surveillance d'un lieu fixe depuis un poste d'observation discret.",
    icon: "Eye",
    priceWeight: 1.3,
  },
  G: {
    id: "G",
    label: "Filature",
    description: "Suivi physique et discret d'une personne dans ses déplacements.",
    icon: "Navigation",
    priceWeight: 1.6,
  },
  H: {
    id: "H",
    label: "Contrôle externe",
    description: "Vérification et constat depuis l'extérieur d'un lieu ou d'un comportement.",
    icon: "ShieldCheck",
    priceWeight: 1.2,
  },
  I: {
    id: "I",
    label: "Solution technique",
    description: "Déploiement d'équipements de surveillance (caméras, GPS, enregistreurs...).",
    icon: "Cpu",
    priceWeight: 2.0,
  },
  J: {
    id: "J",
    label: "Mandat Cyber",
    description: "Enquête numérique avancée, traçage et analyse forensique en ligne.",
    icon: "Globe",
    priceWeight: 2.5,
  },
  K: {
    id: "K",
    label: "Cours en ligne",
    description: "Module de formation à distance, accessible via notre plateforme sécurisée.",
    icon: "Monitor",
    priceWeight: 0.8,
  },
  L: {
    id: "L",
    label: "Cours en présentiel",
    description: "Formation dispensée en personne par nos experts, dans vos locaux ou les nôtres.",
    icon: "Users",
    priceWeight: 1.0,
  },
};

// Mapping service → modules disponibles
export const SERVICE_MODULES: Record<string, string[]> = {
  // ── Particuliers — Recherche de preuves ──
  "infidelite":        ["A", "B", "G"],
  "divorce":           ["A", "B", "D", "E", "G"],
  "garde-pension":     ["A", "B", "D", "E", "F", "G"],
  "addictions":        ["A", "B", "E", "F", "G"],
  "voisinage":         ["A", "B", "F", "G", "I"],
  "harcelement":       ["A", "B", "F", "G", "I"],

  // ── Particuliers — Recherche de personne ──
  "personne-disparue":    ["A", "B", "C", "D", "F", "G", "H"],
  "heritiers":            ["A", "B", "C"],
  "debiteur":             ["A", "B", "C", "D", "E"],
  "temoins":              ["B", "C", "H"],
  "anciens-amis":         ["B", "C", "F", "H"],
  "verification-identite":["B", "C", "F", "H"],

  // ── Entreprises — Menaces internes ──
  "vol-fraude":           ["A", "B", "E", "F", "G", "H", "I"],
  "detournement":         ["A", "B", "E", "F", "G", "H", "I"],
  "moralite-employes":    ["A", "B", "E", "G", "H", "I"],
  "extorsion-interne":    ["A", "B", "J", "F", "G", "I"],

  // ── Entreprises — Menaces externes ──
  "concurrence":          ["A", "B", "J", "F", "G", "I"],
  "espionnage":           ["A", "B", "E", "F", "G", "H", "I"],
  "contrefacon":          ["A", "B", "F", "G", "H", "I", "J"],
  "enquete-commerciale":  ["A", "B", "E"],

  // ── Autres Services ──
  "prevention-vols":          ["H", "I", "K", "L"],
  "renseignements-immobiliers":["A", "B", "F", "G", "H", "I"],
  "surveillance-domicile":    ["F", "I"],
  "protection-privee":        ["F", "I"],
  "e-reputation":             ["A", "B"],
  "sensibilisation":          ["K", "L"],
  "collection-preuve":        ["A", "B", "D", "E", "F", "G", "H", "I"],
};
