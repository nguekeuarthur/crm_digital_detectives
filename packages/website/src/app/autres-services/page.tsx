"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  CheckCircle2,
  Mail,
  Headset,
  Languages,
  User,
  Menu,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { cinzel } from "../fonts";
import { TwinklingDots } from "../../components/TwinklingDots";
import { Footer } from "../../components/Footer";
import { ServiceModal } from "../../components/ServiceModal";
import { autresServices, autresServicesIntro } from "../../data/autres-services";
import type { ServiceDetail } from "../../types/service";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6 },
};

export default function AutresServicesPage() {
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

        <section className="relative z-10 w-full pt-16 pb-12 px-6 md:px-12">
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
              <span className="text-[#b0944e]">Autres</span> services
            </h1>
            <div className="w-16 h-px bg-[#b0944e]/60 mx-auto mb-8" />
            <div className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed space-y-5 font-clash font-light">
              {autresServicesIntro.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="relative z-10 py-12 px-6 md:px-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-[#b0944e] font-clash uppercase tracking-[0.25em] text-xs mb-4">
                Nos expertises complémentaires
              </p>
              <h2 className={`text-2xl md:text-3xl font-bold text-white ${cinzel.className}`}>
                Découvrez nos <span className="text-[#b0944e]">services</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {autresServices.map((service, i) => (
                <motion.button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
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
          </div>
        </section>

        <section className="relative z-10 py-24 px-6 md:px-12 border-t border-[#b0944e]/10">
          <motion.div
            {...fadeUp}
            className="max-w-4xl mx-auto text-center relative bg-zinc-950/70 backdrop-blur-md p-10 md:p-16 rounded-3xl border border-[#b0944e]/20 shadow-[0_0_50px_rgba(212,175,55,0.05)]"
          >
            <Sparkles className="w-11 h-11 text-[#b0944e] mx-auto mb-6" />
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 text-white ${cinzel.className}`}>
              Besoin d'un <span className="text-[#b0944e]">service sur mesure</span> ?
            </h2>
            <p className="text-gray-300 font-clash font-light leading-relaxed mb-10 text-lg max-w-2xl mx-auto">
              Contactez DigitalDetectives pour un premier échange confidentiel et découvrez la
              solution adaptée à votre situation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-[#b0944e] text-black rounded-sm font-bold uppercase tracking-widest hover:bg-white transition-colors inline-flex items-center justify-center gap-3">
                Contactez-nous
                <Mail className="w-5 h-5" />
              </button>
              <button className="font-clash w-full sm:w-auto px-10 py-4 bg-transparent border border-[#b0944e]/60 text-[#b0944e] rounded-sm font-bold uppercase tracking-widest hover:bg-[#b0944e]/10 transition-colors inline-flex items-center justify-center gap-3">
                Créez un compte
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
