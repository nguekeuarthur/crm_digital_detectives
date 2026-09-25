"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  UserCheck,
  ShieldCheck,
  FileSearch,
  Globe2,
  Search,
  Phone,
  UserRound,
  MapPin,
  CheckCircle2,
  Lock,
  SlidersHorizontal,
  BellRing,
  UserPlus,
  ClipboardList,
  Settings2,
  FileText,
  CreditCard,
  Eye,
  Mail,
  Headset,
  Languages,
  User,
  Menu,
} from "lucide-react";
import { cinzel } from "../fonts";
import { TwinklingDots } from "../../components/TwinklingDots";
import { Footer } from "../../components/Footer";
import { ServiceModal } from "../../components/ServiceModal";
import { particulierServices } from "../../data/particuliers-services";

const methods = [
  { icon: Search, label: "Surveillance discrète" },
  { icon: FileSearch, label: "Analyses diverses" },
  { icon: UserRound, label: "Vérification des fréquentations" },
  { icon: MapPin, label: "Contrôles et suivis d'emploi du temps" },
];

const accountBenefits = [
  {
    icon: Lock,
    title: "Sécurité renforcée",
    description:
      "Vos données bénéficient d'un niveau de protection maximal pour garantir leur confidentialité.",
  },
  {
    icon: SlidersHorizontal,
    title: "Accès personnalisé et options flexibles",
    description:
      "Choisissez vos préférences pour chaque investigation : vitesse d'exécution (flash / planifiée / zen) et type de rapport (officiel / personnel / sans rapport).",
  },
  {
    icon: BellRing,
    title: "Sauvegarde et notifications en temps réel",
    description:
      "Accédez à l'historique de vos rapports et recevez des notifications dès que de nouveaux éléments sont ajoutés.",
  },
];

const processSteps = [
  { icon: UserPlus, label: "Créez un compte en toute sécurité" },
  { icon: ClipboardList, label: "Créez votre investigation sur mesure" },
  { icon: Settings2, label: "Choisissez les options que vous voulez" },
  { icon: FileText, label: "Recevez un devis en ligne sous 24h ou obtenez une estimation de votre devis en fonction de vos besoins" },
  { icon: CreditCard, label: "Validez le devis et payez en ligne" },
  { icon: Eye, label: "Suivez l'évolution de votre investigation en temps réel" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

export default function ParticuliersPage() {
  const [selectedService, setSelectedService] = useState<
    (typeof particulierServices)[number] | null
  >(null);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black overflow-x-hidden relative flex flex-col">
      <ServiceModal service={selectedService} onClose={() => setSelectedService(null)} />
      <header className="w-full h-24 relative z-50 flex items-center justify-between px-8 md:px-16 bg-black border-b border-white/5">
        <Link href="/">
          <div className="w-[140px] md:w-[200px]">
            <Image
              src="/images/logo-header.svg"
              alt="DigitalDetectives"
              width={240}
              height={80}
              className="w-full h-auto object-contain cursor-pointer hover:scale-105 transition-transform duration-500"
              priority
            />
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-10 h-full">
          <div className="group relative flex flex-col items-center justify-center cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center text-white/60 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:-translate-y-1">
              <Headset className="w-5 h-5" strokeWidth={1} />
            </div>
            <span className="absolute top-full mt-1 text-[#b0944e] font-light tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">
              AIDE
            </span>
          </div>

          <div className="group relative flex flex-col items-center justify-center cursor-pointer">
            <div className="w-10 h-10 flex items-center justify-center text-white/60 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:-translate-y-1">
              <Languages className="w-5 h-5" strokeWidth={1} />
            </div>
            <span className="absolute top-full mt-1 text-[#b0944e] font-light tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">
              FRANÇAIS
            </span>
          </div>

          <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="group relative flex flex-col items-center justify-center cursor-pointer">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-black bg-[#b0944e] group-hover:scale-105 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.4)]">
              <User className="w-4 h-4" strokeWidth={2} />
            </div>
            <span className="absolute top-full mt-3 text-[#b0944e] font-medium tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">
              MON ESPACE
            </span>
          </a>

          <div className="group relative flex flex-col items-center justify-center cursor-pointer ml-4">
            <div className="w-12 h-12 flex items-center justify-center text-white/50 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:rotate-90">
              <Menu className="w-8 h-8" strokeWidth={1} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex items-center text-white/50 hover:text-[#b0944e] cursor-pointer transition-colors">
          <Menu className="w-8 h-8" strokeWidth={1.5} />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <TwinklingDots />

        {/* HERO */}
        <section className="relative z-10 w-full pt-16 pb-20 px-6 md:px-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[#b0944e]/5 blur-[120px] rounded-full pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative max-w-4xl mx-auto text-center"
          >
            <p className="text-[#b0944e] font-clash font-semibold tracking-[0.3em] uppercase text-xs md:text-sm mb-5">
              DigitalDetectives
            </p>
            <h1
              className={`text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 uppercase ${cinzel.className}`}
            >
              Services pour les{" "}
              <span className="text-[#b0944e]">Particuliers</span>
            </h1>
            <div className="w-16 h-px bg-[#b0944e]/60 mx-auto mb-8" />
            <div className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed space-y-5 font-clash font-light">
              <p>
                Chez DigitalDetectives, nous comprenons que certaines situations de la vie
                personnelle nécessitent d'obtenir des réponses en toute discrétion, avec rigueur
                et professionnalisme.
              </p>
              <p className="text-white/90">
                Spécialisés dans l'enquête privée en Suisse, nos services pour les particuliers
                sont conçus pour vous accompagner dans des moments souvent difficiles.
              </p>
            </div>
          </motion.div>
        </section>

        {/* INFO BLOCKS */}
        <section className="relative z-10 py-8 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              {...fadeUp}
              className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors backdrop-blur-sm text-center"
            >
              <p className="text-gray-300 font-clash font-light leading-relaxed text-lg">
                Notre agence de détective privé en Suisse vous propose des solutions adaptées pour
                obtenir des informations précises, des éléments exploitables et un suivi clair via
                une{" "}
                <strong className="text-white font-medium">
                  interface client sécurisée
                </strong>
                .
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors backdrop-blur-sm text-center"
            >
              <p className="text-gray-300 font-clash font-light leading-relaxed text-lg">
                Avec notre service d'enquête privée avec un accès client sécurisé, vous bénéficiez d'un accompagnement confidentiel, humain et structuré, afin de{" "}
                <strong className="text-white font-medium">
                  protéger vos droits, vos proches et vos intérêts personnels
                </strong>
                .
              </p>
            </motion.div>


          </div>
        </section>

        {/* RECHERCHE DE PREUVES */}
        <section className="relative z-10 py-20 px-6 md:px-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeUp} className="max-w-3xl mx-auto mb-14 text-center">
              <p className="text-[#b0944e] font-clash uppercase tracking-[0.25em] text-xs mb-4">
                Domaines d'intervention
              </p>
              <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-white ${cinzel.className}`}>
                Recherche de <span className="text-[#b0944e]">preuves</span>
              </h2>
              <div className="space-y-5 text-gray-300 font-clash font-light leading-relaxed text-lg">
                <p>
                  Face à des situations personnelles délicates, il est essentiel de pouvoir compter
                  sur des professionnels discrets et efficaces. DigitalDetectives vous propose des
                  solutions sur mesure pour mener une enquête de harcèlement, une enquête de divorce
                  ou encore une enquête d'infidélité en Suisse et à l'international.
                </p>
                <p>
                  Nos clients sont répartis dans toute l'Europe. Nous intervenons au-delà des
                  frontières suisses, en coordination avec des partenaires et des procédures
                  adaptées à chaque pays, tout en respectant les cadres légaux locaux.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {particulierServices.map((service, i) => (
                <motion.button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="group p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/50 hover:bg-[#b0944e]/5 transition-all duration-300 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#b0944e]/10 flex items-center justify-center shrink-0 group-hover:bg-[#b0944e]/20 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-[#b0944e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-clash text-white/90 text-base leading-snug block pt-2 group-hover:text-[#b0944e] transition-colors">
                        {service.label}
                      </span>
                      <span className="font-clash text-xs text-gray-500 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        En savoir plus
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <motion.div
              {...fadeUp}
              className="mt-10 flex items-center justify-center gap-3 text-gray-400 font-clash text-sm"
            >
              <Globe2 className="w-4 h-4 text-[#b0944e]" />
              <span>Interventions en Suisse et à l'international</span>
            </motion.div>
          </div>
        </section>

        {/* ENQUÊTE D'INFIDÉLITÉ */}
        <section className="relative z-10 py-24 px-6 md:px-12 border-t border-[#b0944e]/10">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16">
              <p className="text-[#b0944e] font-clash uppercase tracking-[0.25em] text-xs mb-4">
                Expertise
              </p>
              <h2 className={`text-3xl md:text-5xl font-bold mb-5 text-white ${cinzel.className}`}>
                Enquête d'<span className="text-[#b0944e]">infidélité</span>
              </h2>
              <p className="text-xl text-gray-400 font-clash font-light">
                Vous avez des soupçons concernant la fidélité de votre partenaire ?
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <motion.div {...fadeUp} className="space-y-6 text-gray-300 font-clash font-light leading-relaxed text-lg">
                <p>
                  Nos détectives privés sont spécialisés dans l'enquête d'infidélité en Suisse et
                  mettent en place des investigations totalement discrètes pour confirmer ou infirmer
                  vos doutes. Grâce à une surveillance respectant les cadres légaux, nous recueillons
                  des preuves solides qui vous permettront de prendre des décisions éclairées pour
                  votre avenir.
                </p>
                <div className="p-6 md:p-8 bg-[#b0944e]/5 border border-[#b0944e]/20 rounded-2xl">
                  <p className="text-white/90">
                    Et si la situation implique des déplacements ou une vie partagée entre plusieurs
                    pays, nos équipes peuvent également mener une enquête d'infidélité en Suisse et
                    à l'international (France, Belgique, Luxembourg, Allemagne, Italie, Espagne,
                    etc.), avec une approche coordonnée à l'échelle européenne.
                  </p>
                </div>
              </motion.div>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm"
              >
                <h3 className="text-sm font-clash text-[#b0944e] uppercase tracking-[0.25em] mb-8">
                  Méthodes
                </h3>
                <ul className="space-y-1">
                  {methods.map(({ icon: Icon, label }, i) => (
                    <li
                      key={label}
                      className={`flex items-center gap-4 py-5 ${
                        i < methods.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-[#b0944e]/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[#b0944e]" />
                      </div>
                      <span className="font-clash text-lg text-gray-200">{label}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* OBTENIR DE L'AIDE */}
        <section className="relative z-10 py-24 px-6 md:px-12 border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-[#b0944e]/5 via-transparent to-transparent pointer-events-none" />

          <motion.div
            {...fadeUp}
            className="max-w-4xl mx-auto text-center relative bg-zinc-950/70 backdrop-blur-md p-10 md:p-16 rounded-3xl border border-[#b0944e]/20 shadow-[0_0_50px_rgba(212,175,55,0.05)]"
          >
            <Phone className="w-11 h-11 text-[#b0944e] mx-auto mb-6" />
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 text-white ${cinzel.className}`}>
              Obtenir de l'<span className="text-[#b0944e]">aide</span>
            </h2>
            <p className="text-xl text-[#b0944e] font-clash font-medium mb-4">
              Vous avez des doutes ? Prenez des décisions en toute connaissance de cause.
            </p>
            <p className="text-gray-300 font-clash font-light leading-relaxed mb-4 text-lg">
              Besoin d'une enquête professionnelle en Suisse ou à l'international ?
            </p>
            <p className="text-gray-400 font-clash font-light leading-relaxed mb-10 text-base max-w-2xl mx-auto">
              Que vos besoins concernent une enquête d'infidélité, une enquête de divorce ou une
              enquête de harcèlement, DigitalDetectives intervient en Suisse et peut également vous
              accompagner dans le cadre d'enquêtes internationales ou transfrontalières, avec la
              même exigence de discrétion et de fiabilité.
            </p>
            <p className="text-white/80 font-clash mb-10">
              Contactez-nous dès aujourd'hui pour un premier échange confidentiel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-[#b0944e] text-black rounded-sm font-bold uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center justify-center gap-3">
                Contactez-nous
                <Mail className="w-5 h-5" />
              </button>
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-transparent border border-[#b0944e]/60 text-[#b0944e] rounded-sm font-bold uppercase tracking-widest hover:bg-[#b0944e]/10 transition-colors inline-flex items-center justify-center gap-3">
                Créez votre compte
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* PROCESSUS & COMPTE CLIENT */}
        <section className="relative z-10 py-24 px-6 md:px-12 border-t border-[#b0944e]/10">
          <div className="max-w-6xl mx-auto">
            <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16">
              <p className="text-[#b0944e] font-clash uppercase tracking-[0.25em] text-xs mb-4">
                Votre espace client
              </p>
              <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-white ${cinzel.className}`}>
                Un processus unique, sécurisé, personnalisé et{" "}
                <span className="text-[#b0944e]">connecté</span>
              </h2>
              <p className="text-lg text-gray-300 font-clash font-light leading-relaxed">
                Votre compte DigitalDetectives : votre enquête, vos preuves, votre espace sécurisé,
                accessible 24/24.
              </p>
            </motion.div>

            <motion.div {...fadeUp} className="mb-16">
              <h3 className={`text-2xl font-bold text-center mb-10 text-white ${cinzel.className}`}>
                Pourquoi créer un compte ?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {accountBenefits.map(({ icon: Icon, title, description }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#b0944e]/10 flex items-center justify-center mx-auto mb-6">
                      <Icon className="w-6 h-6 text-[#b0944e]" />
                    </div>
                    <h4 className="font-clash font-semibold text-white text-lg mb-4">{title}</h4>
                    <p className="text-gray-400 font-clash font-light leading-relaxed text-sm">
                      {description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp}>
              <h3 className={`text-2xl font-bold text-center mb-12 text-white ${cinzel.className}`}>
                Les étapes
              </h3>
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute left-[23px] top-2 bottom-2 w-px bg-gradient-to-b from-[#b0944e]/60 via-[#b0944e]/25 to-transparent" />

                <div className="space-y-4">
                  {processSteps.map(({ icon: Icon, label }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.07 }}
                      className="relative flex items-center gap-5 pl-0"
                    >
                      <div className="w-12 h-12 rounded-full border border-[#b0944e]/50 bg-black flex items-center justify-center shrink-0 z-10 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                        <Icon className="w-5 h-5 text-[#b0944e]" />
                      </div>
                      <div className="flex-1 p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/30 transition-colors">
                        <span className="text-[#b0944e] font-clash text-xs uppercase tracking-widest block mb-1">
                          Étape {i + 1}
                        </span>
                        <span className="font-clash text-gray-200">{label}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="mt-16 text-center">
              <button className="font-clash px-12 py-5 bg-[#b0944e] text-black rounded-sm font-bold uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center gap-3 shadow-[0_0_30px_rgba(212,175,55,0.25)]">
                Je crée mon compte
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
