"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  Building2,
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
import { entrepriseSections } from "../../data/entreprises-services";
import type { ServiceDetail } from "../../types/service";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

function ServiceCards({
  services,
  onSelect,
}: {
  services: ServiceDetail[];
  onSelect: (service: ServiceDetail) => void;
}) {
  if (services.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service, i) => (
        <motion.button
          key={service.id}
          type="button"
          onClick={() => onSelect(service)}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.05 }}
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
  );
}

export default function EntreprisesPage() {
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);

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
              Services aux{" "}
              <span className="text-[#b0944e]">Entreprises</span>
            </h1>
            <div className="w-16 h-px bg-[#b0944e]/60 mx-auto mb-8" />
            <div className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed space-y-5 font-clash font-light">
              <p>
                Dans un environnement de plus en plus concurrentiel et complexe, les entreprises
                doivent être vigilantes face aux menaces internes et externes qui pourraient
                compromettre leur succès.
              </p>
              <p className="text-white/90">
                Notre agence de détective à Genève met à disposition sa vaste expertise héritée
                des enquêtes de police judiciaire, ainsi que ses capacités analytiques.
                Indépendamment de cela, nous dispensons des formations de sensibilisation aux
                arnaques et fraudes en entreprise, ainsi que des audits sur les potentielles
                failles de vos processus.
              </p>
            </div>
          </motion.div>
        </section>

        {/* INFO BLOCKS */}
        <section className="relative z-10 py-8 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              {...fadeUp}
              className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors backdrop-blur-sm text-center"
            >
              <p className="text-gray-300 font-clash font-light leading-relaxed">
                Expertise issue de la{" "}
                <strong className="text-white font-medium">police judiciaire</strong>, au service
                de la protection de votre organisation.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors backdrop-blur-sm text-center"
            >
              <p className="text-gray-300 font-clash font-light leading-relaxed">
                <strong className="text-white font-medium">Formations</strong> de sensibilisation
                aux arnaques et fraudes en entreprise.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/40 transition-colors backdrop-blur-sm text-center"
            >
              <p className="text-gray-300 font-clash font-light leading-relaxed">
                <strong className="text-white font-medium">Audits</strong> des failles potentielles
                de vos processus internes.
              </p>
            </motion.div>
          </div>
        </section>

        {/* SERVICE SECTIONS - 2 CARDS LAYOUT */}
        <section className="relative z-10 py-20 px-6 md:px-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              
              {/* CARD 1 : MENACES INTERNES (Base Sombre -> Hover Nuance Dorée) */}
              {entrepriseSections[0] && (
                <motion.div
                  {...fadeUp}
                  className="p-8 md:p-10 rounded-3xl border border-[#b0944e]/30 bg-gradient-to-br from-zinc-950 via-black to-[#b0944e]/10 hover:from-[#b0944e]/20 hover:via-zinc-900 hover:to-black hover:border-[#b0944e] hover:shadow-[0_0_40px_rgba(176,148,78,0.25)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-500 backdrop-blur-md flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-clash uppercase tracking-[0.25em] text-[#b0944e] bg-[#b0944e]/10 px-4 py-1.5 rounded-full border border-[#b0944e]/30 group-hover:bg-[#b0944e] group-hover:text-black transition-all">
                        {entrepriseSections[0].category}
                      </span>
                    </div>

                    <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-white ${cinzel.className}`}>
                      Menaces <span className="text-[#b0944e]">internes</span>
                    </h2>

                    <div className="space-y-4 text-gray-200 font-clash font-light leading-relaxed text-base md:text-lg mb-8">
                      {entrepriseSections[0].paragraphs.map((p) => (
                        <p key={p.slice(0, 40)}>{p}</p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-clash text-[#b0944e] uppercase tracking-[0.2em] mb-4 font-semibold">
                      Services associés
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entrepriseSections[0].services.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service)}
                          className="p-4 rounded-xl border border-white/10 bg-black/60 hover:border-[#b0944e] hover:bg-[#b0944e]/20 transition-all text-left flex items-center justify-between group/btn cursor-pointer"
                        >
                          <span className="font-clash text-sm text-white/90 group-hover/btn:text-[#b0944e] transition-colors">
                            {service.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover/btn:text-[#b0944e] transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CARD 2 : MENACES EXTERNES (Base Sombre -> Hover Nuance Blanche Éclatante) */}
              {entrepriseSections[1] && (
                <motion.div
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="p-8 md:p-10 rounded-3xl border border-white/20 bg-gradient-to-br from-zinc-950 via-black to-white/10 hover:from-white/20 hover:via-zinc-900 hover:to-black hover:border-white/80 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-500 backdrop-blur-md flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-clash uppercase tracking-[0.25em] text-white/80 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 group-hover:bg-white group-hover:text-black transition-all">
                        {entrepriseSections[1].category}
                      </span>
                    </div>

                    <h2 className={`text-3xl md:text-4xl font-bold mb-6 text-white ${cinzel.className}`}>
                      Menaces <span className="text-white group-hover:text-[#b0944e] transition-colors">externes</span>
                    </h2>

                    <div className="space-y-4 text-gray-200 font-clash font-light leading-relaxed text-base md:text-lg mb-8">
                      {entrepriseSections[1].paragraphs.map((p) => (
                        <p key={p.slice(0, 40)}>{p}</p>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-clash text-white/80 uppercase tracking-[0.2em] mb-4 font-semibold group-hover:text-[#b0944e] transition-colors">
                      Services associés
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entrepriseSections[1].services.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setSelectedService(service)}
                          className="p-4 rounded-xl border border-white/10 bg-black/60 hover:border-white hover:bg-white/10 transition-all text-left flex items-center justify-between group/btn cursor-pointer"
                        >
                          <span className="font-clash text-sm text-white/90 group-hover/btn:text-white transition-colors">
                            {service.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-500 group-hover/btn:text-white transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 py-24 px-6 md:px-12 border-t border-[#b0944e]/10">
          <motion.div
            {...fadeUp}
            className="max-w-4xl mx-auto text-center relative bg-zinc-950/70 backdrop-blur-md p-10 md:p-16 rounded-3xl border border-[#b0944e]/20 shadow-[0_0_50px_rgba(212,175,55,0.05)]"
          >
            <Building2 className="w-11 h-11 text-[#b0944e] mx-auto mb-6" />
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 text-white ${cinzel.className}`}>
              Protégez votre <span className="text-[#b0944e]">entreprise</span>
            </h2>
            <p className="text-gray-300 font-clash font-light leading-relaxed mb-10 text-lg max-w-2xl mx-auto">
              Contactez DigitalDetectives pour un premier échange confidentiel sur vos besoins
              d'investigation, de formation ou d'audit.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-[#b0944e] text-black rounded-sm font-bold uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center justify-center gap-3">
                Contactez-nous
                <Mail className="w-5 h-5" />
              </button>
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-transparent border border-[#b0944e]/60 text-[#b0944e] rounded-sm font-bold uppercase tracking-widest hover:bg-[#b0944e]/10 transition-colors inline-flex items-center justify-center gap-3">
                Créez un compte
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
