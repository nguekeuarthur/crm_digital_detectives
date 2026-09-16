import type { ServiceDetail } from "../types/service";

export const particulierServices: ServiceDetail[] = [
  // ── Recherche de preuves ──
  {
    id: "infidelite",
    label: "Infidélité",
    title: "Enquête d'infidélité",
    intro: "Vous avez des soupçons concernant la fidélité de votre partenaire ?",
    modules: ["A", "B", "G"],
    paragraphs: [
      "Nos détectives privés sont spécialisés dans l'enquête d'infidélité en Suisse et mettent en place des investigations totalement discrètes pour confirmer ou infirmer vos doutes. Grâce à une surveillance respectant les cadres légaux, nous recueillons des preuves solides qui vous permettront de prendre des décisions éclairées pour votre avenir.",
      "Et si la situation implique des déplacements ou une vie partagée entre plusieurs pays, nos équipes peuvent également mener une enquête d'infidélité en Suisse et à l'international (France, Belgique, Luxembourg, Allemagne, Italie, Espagne, etc.), avec une approche coordonnée à l'échelle européenne.",
    ],
    methods: [
      "Surveillance discrète",
      "Analyses diverses",
      "Vérification des fréquentations",
      "Contrôles et suivis d'emploi du temps",
    ],
  },
  {
    id: "divorce",
    label: "Divorce",
    title: "Enquête divorce",
    modules: ["A", "B", "D", "E", "G"],
    paragraphs: [
      "Dans le cadre d'une procédure de séparation, une enquête de divorce en Suisse ou à l'international peut jouer un rôle décisif, notamment pour appuyer les revendications de pension alimentaire, de garde d'enfants ou de répartition des biens. Nous vous accompagnons dans cette démarche en récoltant des éléments concrets pour défendre vos intérêts devant la justice.",
    ],
    methods: [
      "Surveillance discrète",
      "Analyses de communications (légales)",
      "Vérification des fréquentations",
    ],
  },
  {
    id: "garde-pension",
    label: "Pension alimentaire / Garde d'enfants",
    title: "Enquête familiale (garde, pension)",
    modules: ["A", "B", "D", "E", "F", "G"],
    paragraphs: [
      "Assurez-vous que les intérêts de vos enfants soient protégés grâce à des investigations adaptées aux contextes de pension alimentaire ou de garde d'enfants. Nous pouvons vous aider à obtenir des preuves de revenus, de négligence, ou de comportements risqués.",
    ],
    methods: [
      "Surveillance des fréquentations",
      "Vérification des lieux de résidence",
      "Analyse des habitudes de vie",
    ],
  },
  {
    id: "addictions",
    label: "Addictions et comportements à risque",
    title: "Enquête comportements à risque et addictions",
    modules: ["A", "B", "E", "F", "G"],
    paragraphs: [
      "Lorsque vous soupçonnez un proche de comportements à risque ou d'addictions, nos services vous permettent de vérifier la situation avec précision et discrétion. Nous intervenons pour récolter des preuves et vous offrir une vision objective de la situation, pour mieux protéger vos proches.",
    ],
    methods: [
      "Surveillance de comportements",
      "Identification de lieux de fréquentation",
      "Preuves photographiques",
      "Relevés de dépenses",
    ],
  },
  {
    id: "voisinage",
    label: "Problèmes de voisinage",
    title: "Enquête problèmes de voisinage",
    modules: ["A", "B", "F", "G", "I"],
    paragraphs: [
      "Nuisances sonores, comportement perturbateur ou intrusion, les conflits de voisinage peuvent être source de stress quotidien. Nos agents vous aident à documenter ces incidents pour renforcer vos actions auprès des autorités compétentes ou pour constituer des preuves dans le cadre de procédures judiciaires.",
    ],
    methods: [
      "Enregistrement d'incidents",
      "Témoignages visuels",
      "Vérifications de sécurité",
      "Collecte de témoignages",
    ],
  },
  {
    id: "harcelement",
    label: "Harcèlement et menaces",
    title: "Enquête de menace et harcèlement",
    modules: ["A", "B", "F", "G", "I"],
    paragraphs: [
      "Être victime de harcèlement ou de menaces peut avoir de lourdes conséquences sur votre quotidien et votre sécurité. Grâce à notre enquête de harcèlement en Suisse, nos détectives privés vous aident à recueillir des preuves tangibles pour soutenir une plainte et faire valoir vos droits.",
      "Nous mettons en place un accompagnement personnalisé afin de documenter chaque incident et d'identifier leurs auteurs.",
    ],
    methods: [
      "Collecte d'appels et messages",
      "Documentation des menaces",
      "Identification des auteurs potentiels",
      "Recherches numériques et sur sites",
    ],
  },

  // ── Recherche de personne ──
  {
    id: "personne-disparue",
    label: "Personne disparue",
    title: "Recherche de personne disparue",
    intro: "Vous cherchez à retrouver la trace d'une personne dont vous avez perdu contact ?",
    modules: ["A", "B", "C", "D", "F", "G", "H"],
    paragraphs: [
      "La disparition d'un proche est une situation de détresse qui nécessite une réaction rapide et professionnelle. Nos enquêteurs mobilisent toutes les ressources disponibles — OSINT, terrain, réseaux — pour retrouver la trace d'une personne disparue en Suisse ou à l'étranger.",
    ],
    methods: [
      "Recherches OSINT multi-sources",
      "Surveillance et filature",
      "Coordination avec autorités",
      "Rapport de localisation complet",
    ],
  },
  {
    id: "heritiers",
    label: "Recherche d'héritiers / Bénéficiaires",
    title: "Recherche d'héritiers et bénéficiaires",
    modules: ["A", "B", "C"],
    paragraphs: [
      "Dans le cadre d'une succession, d'un héritage ou d'un contrat d'assurance, il est parfois nécessaire de localiser des héritiers ou des bénéficiaires perdus de vue. Nous effectuons des recherches documentées pour établir l'identité et l'adresse des personnes concernées.",
    ],
    methods: [
      "Recherche documentaire",
      "Vérification d'identité",
      "Rapport de localisation",
    ],
  },
  {
    id: "debiteur",
    label: "Recherche de débiteur",
    title: "Localisation d'un débiteur",
    modules: ["A", "B", "C", "D", "E"],
    paragraphs: [
      "Un débiteur introuvable empêche le recouvrement de vos créances. Nos équipes localisent les personnes en fuite ou difficiles à trouver, en s'appuyant sur des méthodes légales et éprouvées, pour vous permettre d'engager les démarches judiciaires nécessaires.",
    ],
    methods: [
      "Localisation de résidence actuelle",
      "Recherche de biens et patrimoine",
      "Analyse financière",
      "Rapport documenté pour saisie",
    ],
  },
  {
    id: "temoins",
    label: "Recherche de témoins",
    title: "Localisation de témoins",
    modules: ["B", "C", "H"],
    paragraphs: [
      "Dans le cadre d'une procédure judiciaire ou d'un sinistre, retrouver des témoins oculaires est crucial. Nous identifions et localisons les personnes présentes lors d'un événement pour renforcer votre dossier.",
    ],
    methods: [
      "Identification de témoins potentiels",
      "Recherche de contact actuel",
      "Rapport de localisation",
    ],
  },
  {
    id: "anciens-amis",
    label: "Recherche d'anciens amis / famille",
    title: "Retrouver un proche perdu de vue",
    modules: ["B", "C", "F", "H"],
    paragraphs: [
      "Vous souhaitez retrouver un ami d'enfance, un membre de la famille perdu de vue ou un ancien collègue ? Nos enquêteurs vous aident à renouer ce lien perdu grâce à des recherches discrètes et respectueuses.",
    ],
    methods: [
      "Recherches en sources ouvertes",
      "Vérification de coordonnées",
      "Localisation discrète",
    ],
  },
  {
    id: "verification-identite",
    label: "Vérification d'identité & Antécédents",
    title: "Vérification d'identité et antécédents",
    modules: ["B", "C", "F", "H"],
    paragraphs: [
      "Avant de vous engager avec une personne (partenaire commercial, employé, locataire), il est parfois prudent de vérifier son identité et ses antécédents. Nos services vous fournissent une image claire et vérifiée du profil de la personne concernée.",
    ],
    methods: [
      "Vérification d'identité",
      "Enquête de moralité",
      "Recherche d'antécédents",
      "Rapport confidentiel",
    ],
  },
];
