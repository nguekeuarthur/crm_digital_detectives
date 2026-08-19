"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { cinzel } from "../app/fonts";
import type { ServiceDetail } from "../types/service";

type ServiceModalProps = {
  service: ServiceDetail | null;
  onClose: () => void;
};

export function ServiceModal({ service, onClose }: ServiceModalProps) {
  useEffect(() => {
    if (!service) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [service, onClose]);

  return (
    <AnimatePresence>
      {service && (
        <motion.div
          key={service.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-modal-title"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            aria-label="Fermer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#b0944e]/30 bg-zinc-950 shadow-[0_0_80px_rgba(212,175,55,0.12)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b0944e]/60 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-32 bg-[#b0944e]/10 blur-[60px] pointer-events-none" />

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full border border-white/10 bg-black/60 flex items-center justify-center text-white/60 hover:text-[#b0944e] hover:border-[#b0944e]/40 transition-colors"
              aria-label="Fermer la fenêtre"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto max-h-[90vh] p-8 md:p-10">
              <p className="text-[#b0944e] font-clash uppercase tracking-[0.25em] text-xs mb-3">
                {service.label}
              </p>
              <h2
                id="service-modal-title"
                className={`text-2xl md:text-3xl font-bold text-white mb-2 ${cinzel.className}`}
              >
                {service.title}
              </h2>
              <div className="w-12 h-px bg-[#b0944e]/50 mb-6" />

              {service.intro && (
                <p className="text-[#b0944e]/90 font-clash font-medium mb-5 text-lg">
                  {service.intro}
                </p>
              )}

              <div className="space-y-4 mb-8">
                {service.paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className={`font-clash font-light leading-relaxed ${
                      i === service.paragraphs.length - 1 && service.paragraphs.length > 1
                        ? "text-white/90 p-5 rounded-xl border border-[#b0944e]/20 bg-[#b0944e]/5"
                        : "text-gray-300"
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div>
                <h3 className="font-clash text-[#b0944e] uppercase tracking-[0.2em] text-xs mb-5">
                  Méthodes
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.methods.map((method) => (
                    <li
                      key={method}
                      className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#b0944e]/30 transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#b0944e] shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                      <span className="font-clash text-sm text-gray-200">{method}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <button
                  type="button"
                  className="font-clash w-full px-6 py-3.5 bg-[#b0944e] text-black rounded-sm font-bold uppercase tracking-widest text-sm hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
                >
                  Demander un devis
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
