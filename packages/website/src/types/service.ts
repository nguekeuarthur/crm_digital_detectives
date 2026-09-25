export type ServiceDetail = {
  id: string;
  label: string;
  title: string;
  intro?: string;
  paragraphs: string[];
  methods: string[];
};

export type ServiceSection = {
  id: string;
  category: string;
  title: string;
  highlight?: string;
  paragraphs: string[];
  services: ServiceDetail[];
};
