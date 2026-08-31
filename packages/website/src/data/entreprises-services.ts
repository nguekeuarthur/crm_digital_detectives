import type { ServiceSection } from "../types/service";

export const entrepriseSections: ServiceSection[] = [
  {
    id: "menaces-internes",
    category: "Sécurité interne",
    title: "Menaces internes",
    highlight: "internes",
    paragraphs: [
      "Les menaces internes, qu'elles proviennent de comportements frauduleux ou de pratiques non éthiques au sein de votre entreprise, peuvent sérieusement compromettre la sécurité et la réputation de votre organisation.",
      "Nos détectives sont spécialisés dans l'identification et la documentation de ces menaces pour vous permettre de prendre les décisions appropriées.",
    ],
    services: [
      {
        id: "vol-fraude",
        label: "Vol et fraude interne",
        title: "Vol et fraude interne",
        paragraphs: [
          "Vol de matériel, de données ou de fonds : nous menons des enquêtes discrètes pour identifier les auteurs, documenter les faits et constituer un dossier solide pour vos démarches disciplinaires ou judiciaires.",
        ],
        methods: [
          "Surveillance ciblée",
          "Analyse de procédures internes",
          "Collecte de preuves numériques",
          "Rapport d'investigation",
        ],
      },
      {
        id: "detournement",
        label: "Détournement de fonds",
        title: "Détournement de fonds",
        paragraphs: [
          "Le détournement de fonds peut rester longtemps invisible. Nous traçons les anomalies comptables, les circuits financiers suspects et les comportements à risque au sein de votre organisation.",
        ],
        methods: [
          "Audit comportemental",
          "Analyse financière",
          "Recoupement documentaire",
          "Preuves pour action légale",
        ],
      },
      {
        id: "moralite-employes",
        label: "Moralité des employés",
        title: "Moralité des employés",
        paragraphs: [
          "Comportements inappropriés, conflits d'intérêts ou manquements à la déontologie : nous évaluons la moralité des collaborateurs dans le respect du cadre légal suisse.",
        ],
        methods: [
          "Enquêtes de moralité",
          "Vérification de déclarations",
          "Observation discrète",
          "Rapport RH confidentiel",
        ],
      },
      {
        id: "extorsion-interne",
        label: "Menaces et tentatives d'extorsion",
        title: "Menaces et tentatives d'extorsion",
        paragraphs: [
          "Chantage, pressions ou menaces internes peuvent paralyser une entreprise. Nous documentons les faits, identifions les auteurs et sécurisons vos preuves pour agir en toute légalité.",
        ],
        methods: [
          "Collecte de messages et preuves",
          "Identification des auteurs",
          "Documentation chronologique",
          "Accompagnement stratégique",
        ],
      },
    ],
  },
  {
    id: "menaces-externes",
    category: "Protection externe",
    title: "Menaces externes",
    highlight: "externes",
    paragraphs: [
      "Les menaces externes peuvent inclure des actes de concurrence déloyale, de contrefaçon ou même d'espionnage industriel. Ces risques, bien que souvent invisibles, peuvent avoir des conséquences graves sur la pérennité de votre entreprise.",
      "DigitalDetectives vous aide à surveiller et à combattre ces menaces grâce à l'expertise d'une agence de détective suisse habituée aux dossiers sensibles.",
    ],
    services: [
      {
        id: "concurrence",
        label: "Concurrence déloyale",
        title: "Concurrence déloyale",
        paragraphs: [
          "Débauchage illicite, dénigrement, contournement de contrats : nous investiguons les pratiques de concurrence déloyale pour protéger votre position sur le marché et vos intérêts commerciaux.",
        ],
        methods: [
          "Enquêtes commerciales",
          "Surveillance de marché",
          "Collecte de preuves",
          "Rapport pour action en justice",
        ],
      },
      {
        id: "espionnage",
        label: "Espionnage industriel",
        title: "Espionnage industriel",
        paragraphs: [
          "Vol de secrets industriels, fuites de données ou infiltration : nos enquêteurs identifient les sources de fuite et documentent les atteintes à vos actifs stratégiques.",
        ],
        methods: [
          "Analyse de fuites d'information",
          "Identification de sources",
          "Contre-mesures d'investigation",
          "Rapport sécurisé",
        ],
      },
      {
        id: "contrefacon",
        label: "Contrefaçons",
        title: "Enquête sur les contrefaçons",
        paragraphs: [
          "La contrefaçon nuit à votre marque et à vos revenus. Nous traçons les réseaux de distribution, identifions les responsables et collectons les preuves nécessaires aux actions légales.",
        ],
        methods: [
          "Investigation sur le terrain",
          "Achats tests",
          "Identification de réseaux",
          "Documentation pour plainte",
        ],
      },
      {
        id: "enquete-commerciale",
        label: "Enquête commerciale",
        title: "Enquête commerciale",
        paragraphs: [
          "Avant une acquisition, un partenariat ou une opération stratégique, l'enquête commerciale permet de vérifier la fiabilité d'un acteur, d'un marché ou d'une contrepartie.",
        ],
        methods: [
          "Due diligence commerciale",
          "Vérification de réputation",
          "Analyse de solvabilité",
          "Rapport décisionnel",
        ],
      },
    ],
  },
];

export const allEntrepriseServices = entrepriseSections.flatMap((s) => s.services);
