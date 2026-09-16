"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
interface QualificationGroup {
  key: string;
  label: string;
  options: { id: string; label: string }[];
}

interface EnvOption {
  id: string;
  label: string;
  qualifications: QualificationGroup[];
}

// ── Configuration des lieux et leurs sous-questions ────────────────────────
const ENV_OPTIONS: EnvOption[] = [
  {
    id: "lieu_travail",
    label: "Lieu de travail de la personne concernée",
    qualifications: [
      {
        key: "adresse",
        label: "Adresse connue ?",
        options: [
          { id: "connue", label: "Adresse exacte connue" },
          { id: "approximative", label: "Adresse approximative" },
          { id: "inconnue", label: "Adresse inconnue" },
        ],
      },
      {
        key: "type",
        label: "Type de lieu de travail",
        options: [
          { id: "bureau", label: "Bureau / Open space" },
          { id: "entrepot", label: "Entrepôt / Usine" },
          { id: "commerce", label: "Commerce / Boutique" },
          { id: "autre", label: "Autre" },
        ],
      },
      {
        key: "environnement",
        label: "Environnement",
        options: [
          { id: "urbain", label: "Centre-ville / Urbain" },
          { id: "residentiel", label: "Zone résidentielle" },
          { id: "rural", label: "Zone rurale" },
        ],
      },
    ],
  },
  {
    id: "domicile",
    label: "Domicile de la personne concernée",
    qualifications: [
      {
        key: "adresse",
        label: "Adresse connue ?",
        options: [
          { id: "connue", label: "Adresse exacte connue" },
          { id: "approximative", label: "Adresse approximative" },
          { id: "inconnue", label: "Adresse inconnue" },
        ],
      },
      {
        key: "type",
        label: "Type de logement",
        options: [
          { id: "maison", label: "Maison individuelle" },
          { id: "immeuble", label: "Immeuble / Appartement" },
          { id: "residence_securisee", label: "Résidence sécurisée" },
          { id: "autre", label: "Autre" },
        ],
      },
      {
        key: "environnement",
        label: "Environnement local",
        options: [
          { id: "urbain", label: "Urbain / Ville" },
          { id: "residentiel", label: "Résidentiel" },
          { id: "rural", label: "Rural / Campagne" },
        ],
      },
      {
        key: "accessibilite",
        label: "Accessibilité / Stationnement",
        options: [
          { id: "facile", label: "Facile (rue publique, parking)" },
          { id: "moderee", label: "Modérée (zone limitée)" },
          { id: "difficile", label: "Difficile (accès restreint)" },
        ],
      },
    ],
  },
  {
    id: "lieux_supposes",
    label: "Lieux supposés / Présumés",
    qualifications: [
      {
        key: "precision",
        label: "Niveau de précision des lieux",
        options: [
          { id: "quartier_connu", label: "Quartier / Zone connu(e)" },
          { id: "lieux_habituels", label: "Lieux habituels identifiés" },
          { id: "aucune_info", label: "Aucune information précise" },
        ],
      },
      {
        key: "frequence",
        label: "Fréquentation supposée",
        options: [
          { id: "quotidienne", label: "Quotidienne" },
          { id: "reguliere", label: "Régulière (plusieurs fois/sem)" },
          { id: "occasionnelle", label: "Occasionnelle" },
        ],
      },
    ],
  },
  {
    id: "autre",
    label: "Autre lieu (à préciser)",
    qualifications: [
      {
        key: "description",
        label: "Type de lieu",
        options: [
          { id: "lieu_loisirs", label: "Lieu de loisirs / Sport" },
          { id: "lieu_culte", label: "Lieu de culte" },
          { id: "etablissement_scolaire", label: "Établissement scolaire" },
          { id: "autre", label: "Autre" },
        ],
      },
    ],
  },
  {
    id: "je_ne_sais_pas",
    label: "Je ne sais pas",
    qualifications: [], // Aucune sous-question
  },
];

// ── Types d'état ───────────────────────────────────────────────────────────
type QualificationState = Record<string, Record<string, string>>;

interface MultiSelectEnvironmentStepProps {
  onConfirm: (selected: string[], qualifications: QualificationState) => void;
}

// ── Composant principal ────────────────────────────────────────────────────
export function MultiSelectEnvironmentStep({
  onConfirm,
}: MultiSelectEnvironmentStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<QualificationState>({});

  const toggle = (id: string) => {
    if (id === "je_ne_sais_pas") {
      setSelected(["je_ne_sais_pas"]);
      setExpanded(null);
      return;
    }
    // Désélectionner si on clique sur le même
    if (selected.includes(id)) {
      setSelected([]);
      setExpanded(null);
    } else {
      // Sélection unique : on remplace le tableau
      setSelected([id]);
      setExpanded(id);
    }
  };

  const setQualification = (envId: string, key: string, value: string) => {
    setQualifications((prev) => ({
      ...prev,
      [envId]: { ...(prev[envId] || {}), [key]: value },
    }));
  };

  const canConfirm = selected.length > 0;

  // Vérifie si toutes les qualifications obligatoires sont remplies
  const isEnvQualified = (envId: string) => {
    const env = ENV_OPTIONS.find((e) => e.id === envId);
    if (!env || env.qualifications.length === 0) return true;
    return env.qualifications.every(
      (q) => qualifications[envId]?.[q.key]
    );
  };

  const allQualified = selected.every(isEnvQualified);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative z-10 w-full max-w-2xl mx-auto px-4"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-amber-600 mb-2">
          Environnements d&apos;observation
        </h2>
        <p className="text-neutral-400 text-sm">
          Sélectionnez le lieu principal où la personne concernée pourrait être observée
        </p>
      </div>

      <div className="space-y-3">
        {ENV_OPTIONS.map((env) => {
          const isSelected = selected.includes(env.id);
          const isOpen = expanded === env.id && isSelected;
          const qualified = isSelected ? isEnvQualified(env.id) : true;

          return (
            <div
              key={env.id}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isSelected
                  ? "border-amber-500/60 bg-neutral-900/80 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                  : "border-neutral-800 bg-neutral-950/60"
              }`}
            >
              {/* ── En-tête cliquable ── */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer group"
                onClick={() => toggle(env.id)}
              >
                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-amber-500 border-amber-500"
                      : "border-neutral-600 group-hover:border-amber-500/50"
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
                </div>


                <span
                  className={`font-semibold flex-1 text-center transition-colors ${
                    isSelected ? "text-white" : "text-neutral-400 group-hover:text-white"
                  }`}
                >
                  {env.label}
                </span>

                {/* Badge "Qualifié" */}
                {isSelected && env.qualifications.length > 0 && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium mr-2 ${
                      qualified
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {qualified ? "✓ Qualifié" : "À compléter"}
                  </span>
                )}

                {/* Flèche accordéon */}
                {isSelected && env.qualifications.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(isOpen ? null : env.id);
                    }}
                    className="text-neutral-500 hover:text-amber-500 transition-colors"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>

              {/* ── Sous-questions (accordéon) ── */}
              <AnimatePresence>
                {isOpen && env.qualifications.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 space-y-5 border-t border-neutral-800">
                      {env.qualifications.map((group) => (
                        <div key={group.key}>
                          <p className="text-xs text-amber-500/80 uppercase tracking-widest font-semibold mb-2">
                            {group.label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {group.options.map((opt) => {
                              const isChosen =
                                qualifications[env.id]?.[group.key] === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() =>
                                    setQualification(env.id, group.key, opt.id)
                                  }
                                  className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                                    isChosen
                                      ? "bg-amber-500 border-amber-500 text-black font-semibold"
                                      : "border-neutral-700 text-neutral-400 hover:border-amber-500/50 hover:text-white"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Bouton Confirmer ── */}
      <div className="mt-8 flex justify-center">
        <motion.button
          onClick={() => onConfirm(selected, qualifications)}
          disabled={!canConfirm || !allQualified}
          whileHover={{ scale: canConfirm && allQualified ? 1.02 : 1 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest transition-all ${
            canConfirm && allQualified
              ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)]"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
          }`}
        >
          Confirmer mes choix
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      {!allQualified && canConfirm && (
        <p className="text-center text-amber-500/60 text-xs mt-3">
          Veuillez compléter les qualifications pour chaque lieu sélectionné
        </p>
      )}
    </motion.div>
  );
}
