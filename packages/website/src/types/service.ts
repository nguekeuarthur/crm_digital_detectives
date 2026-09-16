export type ServiceDetail = {
  id: string;
  label: string;
  title: string;
  intro?: string;
  paragraphs: string[];
  methods: string[];
  modules?: string[]; // Codes des modules de prestation (A, B, C...)
};

export type ServiceSection = {
  id: string;
  category: string;
  title: string;
  highlight?: string;
  paragraphs: string[];
  services: ServiceDetail[];
};
