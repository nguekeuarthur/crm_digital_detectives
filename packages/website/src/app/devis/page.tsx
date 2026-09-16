"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { MultiSelectEnvironmentStep } from "../../components/MultiSelectEnvironmentStep";
import { ModuleSelectionStep } from "../../components/ModuleSelectionStep";

// Imports des données
import { particulierServices } from "../../data/particuliers-services";
import { allEntrepriseServices } from "../../data/entreprises-services";
import { autresServices } from "../../data/autres-services";
import { SERVICE_MODULES } from "../../data/modules-catalog";

// Imports des icônes animées sur mesure
import { CustomIconMap } from "../../components/AnimatedCustomIcons";
import { UserCircle, Mail, Phone, Map, Shield, Scan } from "lucide-react";
import { TwinklingDots } from "../../components/TwinklingDots";

const getIconForId = (id: string) => {
  return CustomIconMap[id] || CustomIconMap["enquete-commerciale"];
};

// ── Options de sélection ───────────────────────────────────────────────────
const GEO_OPTIONS = [
  { id: "local", label: "Local", description: "Suisse / Canton" },
  { id: "national", label: "National", description: "Toute la Suisse" },
  { id: "international", label: "International", description: "À l'étranger" },
];

// Profil POR mis à jour (4 options selon document client)
const TARGET_OPTIONS = [
  {
    id: "accessible",
    label: "Accessible",
    description: "Présence visible, habitudes identifiables (domicile, travail, réseaux sociaux...)",
  },
  {
    id: "discret",
    label: "Discret",
    description: "Peu d'informations accessibles, habitudes à recouper pour localiser.",
  },
  {
    id: "tres_discret",
    label: "Très discret",
    description: "Change régulièrement de lieux ou laisse très peu de traces exploitables.",
  },
  {
    id: "indetermine",
    label: "Indéterminé",
    description: "Informations insuffisantes pour évaluer ce paramètre.",
  },
];

// Délai d'intervention (remplace Logistique)
const DELAI_OPTIONS = [
  {
    id: "standard",
    label: "Standard",
    description: "Démarrage sous 1 à 2 semaines. Pas d'échéance particulière.",
  },
  {
    id: "urgent",
    label: "Urgent",
    description: "Démarrage sous 2-3 jours. Échéance proche ou situation évolutive.",
  },
  {
    id: "tres_urgent",
    label: "Très urgent",
    description: "Démarrage dans les prochaines heures. Opportunité à ne pas manquer.",
  },
  {
    id: "je_ne_sais_pas",
    label: "Je ne sais pas",
    description: "Délai difficile à évaluer pour le moment.",
  },
];

// ── Layout Orbital ─────────────────────────────────────────────────────────
const OrbitalLayout = ({
  options,
  onSelect,
  question,
  hoveredOption,
  setHoveredOption,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (id: string, opt: any) => void;
  question: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hoveredOption: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setHoveredOption: (opt: any) => void;
}) => {
  const baseRadius = options.length > 5 ? 350 : 280;

  return (
    <div className="relative w-[350px] h-[350px] md:w-[700px] md:h-[700px] flex items-center justify-center mt-12 mb-12">
      {/* Anneaux décoratifs */}
      <div className="absolute inset-4 md:inset-8 border border-amber-500/10 rounded-full animate-[spin_60s_linear_infinite]" />
      <div className="absolute inset-16 md:inset-24 border border-amber-700/20 rounded-full border-dashed animate-[spin_40s_linear_infinite_reverse]" />

      {/* Panneau central */}
      <div className="absolute z-10 w-[260px] h-[260px] md:w-[340px] md:h-[340px] bg-neutral-950/95 border border-amber-500/30 rounded-full shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col items-center justify-center text-center p-8 transition-all duration-300">
        {hoveredOption ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
            {hoveredOption.icon && (
              <hoveredOption.icon strokeWidth={2.5} className="w-16 h-16 text-amber-500 mb-3" />
            )}
            <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-tight">
              {hoveredOption.label || hoveredOption.title}
            </h3>
            <p className="text-xs md:text-sm text-neutral-400 line-clamp-3">
              {hoveredOption.intro || hoveredOption.description || hoveredOption.paragraphs?.[0]}
            </p>
            {hoveredOption.methods && (
              <ul className="mt-3 text-[10px] md:text-xs text-amber-400 text-left list-disc pl-4 space-y-1">
                {hoveredOption.methods.slice(0, 3).map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-amber-600 mb-2">
              {question}
            </h2>
            <p className="text-sm text-neutral-500">Survolez un élément pour en savoir plus</p>
          </div>
        )}
      </div>

      {/* Éléments en orbite */}
      {options.map((opt, index) => {
        const angle = (index / options.length) * 2 * Math.PI - Math.PI / 2;
        const distanceVariance = index % 2 === 0 ? -50 : 60;
        const randomExtra = Math.sin(index * 45) * 20;
        const angleOffset = index % 3 === 0 ? 0.15 : index % 3 === 1 ? -0.1 : 0.05;
        const responsiveRadius =
          typeof window !== "undefined" && window.innerWidth < 768
            ? baseRadius * 0.6
            : baseRadius;
        const finalRadius = responsiveRadius + distanceVariance + randomExtra;
        const finalAngle = angle + angleOffset;
        const x = finalRadius * Math.cos(finalAngle);
        const y = finalRadius * Math.sin(finalAngle);
        const IconComponent = getIconForId(opt.id);

        return (
          <motion.div
            key={opt.id}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, x, y, rotate: 0 }}
            exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 150, damping: 12, mass: 0.8, delay: index * 0.05 }}
            className="absolute w-20 h-20 md:w-28 md:h-28 rounded-full bg-neutral-950 border border-neutral-800 hover:border-amber-500 flex flex-col items-center justify-center cursor-pointer hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-110 z-20 group transition-all"
            onMouseEnter={() => setHoveredOption({ ...opt, icon: IconComponent })}
            onMouseLeave={() => setHoveredOption(null)}
            onClick={() => onSelect(opt.id, { ...opt, icon: IconComponent })}
          >
            <IconComponent strokeWidth={2.5} className="w-10 h-10 md:w-12 md:h-12 text-amber-500/80 group-hover:text-amber-400 transition-colors" />
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Page principale ────────────────────────────────────────────────────────
export default function DevisPage() {
  const [step, setStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hoveredOption, setHoveredOption] = useState<any>(null);
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "", canton: "" });
  const [score, setScore] = useState<number | null>(null);

  const getServiceOptions = () => {
    if (answers.category === "particuliers") return particulierServices;
    if (answers.category === "entreprises") return allEntrepriseServices;
    if (answers.category === "autres") return autresServices;
    return [];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = (key: string, value: string, optObject: any) => {
    setHoveredOption(null);
    setAnswers({ ...answers, [key]: value, [`${key}_details`]: optObject });
    setStep(step + 1);
  };

  const handleEnvConfirm = (
    selected: string[],
    qualifications: Record<string, Record<string, string>>
  ) => {
    setAnswers({
      ...answers,
      environments: selected,
      envQualifications: qualifications,
    });
    setStep(6); // Délai
  };

  const handleModulesConfirm = (selectedModules: string[]) => {
    setAnswers({ ...answers, selectedModules });
    setStep(8); // Formulaire contact
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(9); // Loading
    try {
      const visitorId = localStorage.getItem("dd_visitor_id") || crypto.randomUUID();
      localStorage.setItem("dd_visitor_id", visitorId);

      const payload = {
        visitorId,
        answers: {
          ...answers,
          modules: answers.selectedModules || [answers.service],
          client: clientInfo,
        },
      };

      const res = await fetch("http://localhost:3000/api/chatbot/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setScore(data.score);
      setStep(10);
    } catch (err) {
      console.error("Erreur de calcul:", err);
      setStep(10);
    } finally {
      setIsLoading(false);
    }
  };

  // Modules disponibles pour le service sélectionné
  const currentServiceModules = answers.service
    ? SERVICE_MODULES[answers.service] || []
    : [];

  return (
    <main className="relative min-h-screen bg-black text-white font-sans flex flex-col overflow-hidden">
      <TwinklingDots />
      <Header />
      <div className="relative flex-1 bg-neutral-950/40 overflow-x-hidden flex flex-col items-center justify-center py-12 md:py-24 min-h-[800px]">

        {/* Background Gradients & Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[150px]" />
        </div>

        {/* Wrapper to scale down the entire wizard UI */}
        <div className="w-full flex items-center justify-center transform scale-75 md:scale-[0.85] origin-center mt-[-40px]">
          <AnimatePresence mode="wait">

            {/* ── Step 0 : Accueil ── */}
            {step === 0 && (
              <motion.div key="step-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 flex flex-col items-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-center">
                  Devis <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">Interactif</span>
                </h1>
                <p className="text-neutral-400 mb-16 text-center max-w-lg">
                  Découvrez le coût estimé de votre investigation de manière totalement anonyme et sécurisée.
                </p>
                <div className="relative w-[400px] h-[400px] flex items-center justify-center">
                  <div className="absolute inset-0 border border-amber-500/30 rounded-full border-dashed animate-[spin_30s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
                  </div>
                  <div className="absolute inset-10 border border-amber-500/20 rounded-full animate-[spin_20s_linear_infinite_reverse]">
                    <div className="absolute bottom-0 left-1/4 w-6 h-6 bg-amber-300 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                  </div>
                  <div className="absolute inset-20 border border-amber-500/10 rounded-full animate-[spin_40s_linear_infinite]">
                    <div className="absolute top-1/4 right-0 w-4 h-4 bg-amber-600 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                  </div>
                  <button onClick={() => setStep(1)} className="relative z-10 w-56 h-56 rounded-full bg-neutral-950 border-2 border-amber-500 flex flex-col items-center justify-center gap-3 cursor-pointer group hover:shadow-[0_0_80px_rgba(245,158,11,0.5)] transition-all">
                    <span className="font-bold text-amber-500 tracking-widest text-lg animate-pulse">DÉMARRER</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1 : Profil client ── */}
            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center">
                <OrbitalLayout
                  question="Quel est votre profil ?"
                  options={[
                    { id: "particuliers", label: "Particuliers", description: "Affaires familiales, privées..." },
                    { id: "entreprises", label: "Entreprises", description: "Fraude, concurrence, RH..." },
                    { id: "autres", label: "Autres", description: "Prévention, cybersécurité..." },
                  ]}
                  onSelect={(id, opt) => handleSelect("category", id, opt)}
                  hoveredOption={hoveredOption}
                  setHoveredOption={setHoveredOption}
                />
              </motion.div>
            )}

            {/* ── Step 2 : Service ── */}
            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center">
                <OrbitalLayout
                  question="Sélectionnez votre prestation"
                  options={getServiceOptions()}
                  onSelect={(id, opt) => handleSelect("service", id, opt)}
                  hoveredOption={hoveredOption}
                  setHoveredOption={setHoveredOption}
                />
              </motion.div>
            )}

            {/* ── Step 3 : Géographie ── */}
            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center">
                <OrbitalLayout
                  question="Où se déroulera l'enquête ?"
                  options={GEO_OPTIONS}
                  onSelect={(id, opt) => handleSelect("geo", id, opt)}
                  hoveredOption={hoveredOption}
                  setHoveredOption={setHoveredOption}
                />
              </motion.div>
            )}

            {/* ── Step 4 : Profil POR (4 options) ── */}
            {step === 4 && (
              <motion.div key="step-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center">
                <OrbitalLayout
                  question="Profil de la personne recherchée"
                  options={TARGET_OPTIONS}
                  onSelect={(id, opt) => handleSelect("target", id, opt)}
                  hoveredOption={hoveredOption}
                  setHoveredOption={setHoveredOption}
                />
              </motion.div>
            )}

            {/* ── Step 5 : Environnements (multi-sélection) ── */}
            {step === 5 && (
              <MultiSelectEnvironmentStep
                key="step-5"
                onConfirm={handleEnvConfirm}
              />
            )}

            {/* ── Step 6 : Délai d'intervention ── */}
            {step === 6 && (
              <motion.div key="step-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center">
                <OrbitalLayout
                  question="Délai d'intervention"
                  options={DELAI_OPTIONS}
                  onSelect={(id, opt) => {
                    setHoveredOption(null);
                    setAnswers({ ...answers, delai: id, delai_details: opt });
                    setStep(7);
                  }}
                  hoveredOption={hoveredOption}
                  setHoveredOption={setHoveredOption}
                />
              </motion.div>
            )}

            {/* ── Step 7 : Sélection des modules de prestation ── */}
            {step === 7 && currentServiceModules.length > 0 && (
              <ModuleSelectionStep
                key="step-7"
                serviceModules={currentServiceModules}
                serviceLabel={answers.service_details?.label || "votre prestation"}
                onConfirm={handleModulesConfirm}
              />
            )}

            {/* ── Step 8 : Formulaire contact ── */}
            {step === 8 && (
              <motion.div key="step-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-10 w-full max-w-md mx-auto p-8 bg-neutral-900/90 backdrop-blur-2xl border border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] mt-12">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-neutral-950 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center">
                  <Shield strokeWidth={1} className="w-12 h-12 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                </div>
                <h2 className="text-2xl font-bold text-amber-500 mb-2 text-center mt-6">Dernière étape</h2>
                <p className="text-neutral-400 text-sm text-center mb-8">
                  Vos données sont cryptées de bout en bout. Laissez vos coordonnées pour afficher l&apos;estimation immédiate.
                </p>
                <form onSubmit={submitForm} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Prénom & Nom</label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <input required type="text" value={clientInfo.name} onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 outline-none transition-colors" placeholder="Jean Dupont" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <input required type="email" value={clientInfo.email} onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 outline-none transition-colors" placeholder="jean@exemple.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <input required type="tel" value={clientInfo.phone} onChange={e => setClientInfo({ ...clientInfo, phone: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 outline-none transition-colors" placeholder="+41 79 123 45 67" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Canton / Ville</label>
                    <div className="relative">
                      <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                      <input required type="text" value={clientInfo.canton} onChange={e => setClientInfo({ ...clientInfo, canton: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 outline-none transition-colors" placeholder="Genève" />
                    </div>
                  </div>
                  <button type="submit" className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all flex items-center justify-center gap-2">
                    <Scan className="w-5 h-5" /> Générer mon estimation
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 9 : Loading ── */}
            {step === 9 && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 flex flex-col items-center justify-center h-64">
                <div className="w-32 h-32 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin shadow-[0_0_50px_rgba(245,158,11,0.3)]" />
                <p className="mt-8 text-amber-500 animate-pulse font-medium text-lg tracking-widest">CALCUL EN COURS...</p>
              </motion.div>
            )}

            {/* ── Step 10 : Résultat ── */}
            {step === 10 && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 flex flex-col items-center">
                <div className="relative w-[350px] h-[350px] flex items-center justify-center mb-12 mt-8">
                  <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-[50px] animate-pulse" />
                  <div className="absolute inset-0 border-2 border-amber-500/50 rounded-full border-dashed animate-[spin_20s_linear_infinite]" />
                  <div className="relative z-10 w-[280px] h-[280px] bg-neutral-950 border-4 border-amber-500 rounded-full flex flex-col items-center justify-center shadow-[0_0_80px_rgba(245,158,11,0.4)]">
                    <p className="text-neutral-400 text-sm uppercase tracking-widest mb-2 font-bold mt-4">ESTIMATION</p>
                    <h2 className="text-5xl font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                      {score !== null ? `${score} CHF` : "Erreur"}
                    </h2>
                    <p className="text-xs text-amber-500/80 uppercase tracking-widest">* Hors frais annexes</p>
                  </div>
                </div>
                <div className="max-w-lg text-center bg-neutral-900/50 backdrop-blur-md p-8 rounded-3xl border border-neutral-800">
                  <h3 className="text-xl font-bold text-amber-500 mb-4">Dossier Transmis</h3>
                  <p className="text-neutral-300 mb-8 leading-relaxed">
                    Merci <strong className="text-white">{clientInfo.name}</strong>. Vos informations hautement confidentielles ont bien été reçues.
                    Un expert va analyser votre demande de <strong className="text-amber-500">{answers.service_details?.label?.toLowerCase() || "service"}</strong> et vous recontacter très prochainement pour valider ce devis.
                  </p>
                  <button onClick={() => { setStep(0); setAnswers({}); }} className="px-8 py-4 rounded-full bg-neutral-950 border border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-500 transition-all text-amber-500 font-bold uppercase tracking-widest text-sm">
                    Clôturer la session
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </main>
  );
}
