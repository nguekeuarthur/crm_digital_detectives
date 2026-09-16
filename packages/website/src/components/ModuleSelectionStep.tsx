"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ArrowRight,
  Info,
  FileText,
  Search,
  FileSearch,
  Home,
  BarChart2,
  Eye,
  Navigation,
  ShieldCheck,
  Cpu,
  Globe,
  Monitor,
  Users,
} from "lucide-react";
import { MODULE_CATALOG } from "../data/modules-catalog";

const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  Search,
  FileSearch,
  Home,
  BarChart2,
  Eye,
  Navigation,
  ShieldCheck,
  Cpu,
  Globe,
  Monitor,
  Users,
};

// ── Props ──────────────────────────────────────────────────────────────────
interface ModuleSelectionStepProps {
  serviceModules: string[]; // ex: ["A", "B", "G"]
  serviceLabel: string;     // ex: "Infidélité"
  onConfirm: (selectedModules: string[]) => void;
}

// ── Composant ──────────────────────────────────────────────────────────────
export function ModuleSelectionStep({
  serviceModules,
  serviceLabel,
  onConfirm,
}: ModuleSelectionStepProps) {
  // Tous les modules sont pré-sélectionnés par défaut
  const [selected, setSelected] = useState<string[]>([...serviceModules]);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const toggle = (moduleId: string) => {
    setSelected((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 w-full max-w-2xl mx-auto px-4"
    >
      {/* ── Header ── */}
      <div className="text-center mb-8">
        <p className="text-amber-500/70 text-xs uppercase tracking-widest font-semibold mb-1">
          Prestation — {serviceLabel}
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-amber-600 mb-2">
          Composez votre mission
        </h2>
        <p className="text-neutral-400 text-sm max-w-md mx-auto">
          Voici les modules inclus dans votre prestation. Vous pouvez les ajuster
          selon vos besoins — nos experts valideront la configuration finale.
        </p>
      </div>

      {/* ── Info ── */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-6">
        <Info className="w-4 h-4 text-amber-500/70 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-400 leading-relaxed">
          Les modules pré-sélectionnés correspondent à la configuration standard
          recommandée par nos enquêteurs pour une prestation{" "}
          <span className="text-amber-400 font-medium">{serviceLabel}</span>.
          Certains modules peuvent être optionnels selon votre situation.
        </p>
      </div>

      {/* ── Grille de modules ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {serviceModules.map((moduleId, index) => {
          const mod = MODULE_CATALOG[moduleId];
          if (!mod) return null;

          const isSelected = selected.includes(moduleId);
          const IconComponent = ICON_MAP[mod.icon] || FileText;
          const isHovered = hoveredModule === moduleId;

          return (
            <motion.div
              key={moduleId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggle(moduleId)}
              onMouseEnter={() => setHoveredModule(moduleId)}
              onMouseLeave={() => setHoveredModule(null)}
              className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-neutral-900/90 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                  : "bg-neutral-950/60 border-neutral-800 opacity-60 hover:opacity-80"
              }`}
            >
              {/* Lettre code (coin haut gauche) */}
              <div className="absolute top-3 left-3 w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <span className="text-amber-500 font-bold text-[11px]">
                  {moduleId}
                </span>
              </div>

              {/* Checkbox (coin haut droit) */}
              <div
                className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-amber-500 border-amber-500"
                    : "border-neutral-600"
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-black" strokeWidth={3} />
                )}
              </div>

              {/* Icône */}
              <div className="mt-6 mb-2">
                <IconComponent
                  className={`w-8 h-8 transition-colors ${
                    isSelected ? "text-amber-500" : "text-neutral-600"
                  }`}
                  strokeWidth={1.5}
                />
              </div>

              {/* Label */}
              <h3
                className={`font-semibold text-sm leading-tight mb-1 transition-colors ${
                  isSelected ? "text-white" : "text-neutral-500"
                }`}
              >
                {mod.label}
              </h3>

              {/* Description (au survol) */}
              <motion.p
                animate={{ opacity: isHovered && isSelected ? 1 : 0, height: isHovered && isSelected ? "auto" : 0 }}
                className="text-neutral-500 text-xs leading-relaxed overflow-hidden"
              >
                {mod.description}
              </motion.p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Résumé sélection ── */}
      <div className="mt-6 flex items-center justify-between bg-neutral-900/50 border border-neutral-800 rounded-xl px-5 py-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest">Modules sélectionnés</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.map((id) => (
              <span key={id} className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {id}
              </span>
            ))}
          </div>
        </div>
        <p className="text-neutral-600 text-xs">{selected.length} / {serviceModules.length}</p>
      </div>

      {/* ── Bouton Continuer ── */}
      <div className="mt-6 flex justify-center">
        <motion.button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          whileHover={{ scale: selected.length > 0 ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all ${
            selected.length > 0
              ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.4)]"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
          }`}
        >
          Confirmer ma sélection
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
