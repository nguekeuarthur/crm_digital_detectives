import type { ServiceDetail } from "../types/service";

export const autresServicesIntro = {
  title: "Autres services",
  paragraphs: [
    "Au-delà des enquêtes pour particuliers et entreprises, DigitalDetectives propose une gamme de services complémentaires pour sécuriser votre environnement, protéger votre vie privée et préserver votre réputation.",
    "De la prévention des vols à la gestion de l'e-réputation, nos experts vous accompagnent avec discrétion, rigueur et professionnalisme, en Suisse et à l'international.",
  ],
};

export const autresServices: ServiceDetail[] = [
  {
    id: "prevention-vols",
    label: "Prévention des vols",
    title: "Prévention des vols",
    paragraphs: [
      "La prévention des vols est essentielle pour protéger vos biens et assurer la tranquillité de votre espace personnel ou professionnel. Nos experts analysent les vulnérabilités de votre environnement et vous conseillent sur les meilleures pratiques pour minimiser les risques.",
      "Que ce soit par l'installation de dispositifs de sécurité ou par la mise en œuvre de stratégies de dissuasion, nous vous aidons à renforcer la protection de votre domicile ou de votre entreprise.",
    ],
    methods: [
      "Analyse des vulnérabilités",
      "Conseil en dispositifs de sécurité",
      "Stratégies de dissuasion",
      "Plan de protection sur mesure",
    ],
  },
  {
    id: "renseignements-immobiliers",
    label: "Renseignements immobiliers",
    title: "Renseignements immobiliers",
    paragraphs: [
      "Ce service innovant permet aux propriétaires, régisseurs et professionnels de l'immobilier d'obtenir des renseignements fiables sur situations locatives, antécédents locataires et problèmes de voisinage. Grâce à un processus totalement novateur d'investigations, il vérifie solvabilité, moralité et historique via des recherches approfondies, avec rapports détaillés incluant preuves tangibles.",
    ],
    methods: [
      "Vérification de solvabilité",
      "Enquête de moralité locataire",
      "Analyse d'antécédents",
      "Rapport détaillé avec preuves",
    ],
  },
  {
    id: "surveillance-domicile",
    label: "Surveillance de domicile",
    title: "Surveillance de domicile",
    paragraphs: [
      "Assurez la sécurité de votre foyer grâce à notre service de surveillance de domicile, conçu pour offrir une protection permanente. Nos solutions discrètes et modernes incluent des caméras de surveillance, des systèmes d'alarme et des détecteurs de mouvement, tous adaptés à vos besoins spécifiques.",
      "Nous proposons également un suivi à distance pour que vous puissiez surveiller votre domicile en temps réel, même lorsque vous êtes absent.",
    ],
    methods: [
      "Caméras de surveillance",
      "Systèmes d'alarme",
      "Détecteurs de mouvement",
      "Suivi à distance en temps réel",
    ],
  },
  {
    id: "protection-privee",
    label: "Protection de la sphère privée",
    title: "Protection de la sphère privée",
    paragraphs: [
      "La protection de la vie privée est devenue primordiale dans un monde où les intrusions, qu'elles soient numériques ou physiques, sont de plus en plus courantes. Nos services vous aident à protéger vos informations personnelles et sensibles des menaces externes.",
      "Cela comprend des analyses de sécurité numérique, des audits pour détecter les écoutes ou les dispositifs de surveillance illicites, et des conseils pour renforcer la confidentialité de vos communications.",
    ],
    methods: [
      "Analyse de sécurité numérique",
      "Détection d'écoutes illicites",
      "Audit de dispositifs de surveillance",
      "Conseil en confidentialité",
    ],
  },
  {
    id: "e-reputation",
    label: "E-réputation",
    title: "E-réputation",
    paragraphs: [
      "Dans un monde interconnecté, votre réputation en ligne est cruciale. Notre service de gestion d'e-réputation surveille les mentions de votre nom ou de votre marque sur le web et les réseaux sociaux. En cas de contenu nuisible ou diffamatoire, nous intervenons pour en limiter l'impact et restaurer votre image.",
      "Nous mettons en place des stratégies de nettoyage de contenu, de réponse proactive et de renforcement de votre présence en ligne, pour que vous puissiez maintenir une réputation positive.",
    ],
    methods: [
      "Veille en ligne et réseaux sociaux",
      "Nettoyage de contenu nuisible",
      "Réponse proactive",
      "Renforcement de présence digitale",
    ],
  },
  {
    id: "sensibilisation",
    label: "Sensibilisation des employés",
    title: "Sensibilisation des employés face aux menaces",
    paragraphs: [
      "Dans un monde où les menaces internes et externes sont omniprésentes, la sensibilisation des employés est votre première ligne de défense. Nos experts forment vos équipes aux bonnes pratiques de sécurité, qu'il s'agisse de repérer des comportements suspects, d'éviter les erreurs humaines, ou de gérer les informations sensibles avec précaution.",
      "À travers des sessions interactives et des mises en situation, nous aidons vos employés à développer une vigilance accrue et à adopter des réflexes qui réduisent les risques pour votre entreprise.",
    ],
    methods: [
      "Sessions interactives",
      "Mises en situation",
      "Formation aux bonnes pratiques",
      "Programme de vigilance sur mesure",
    ],
  },
];
