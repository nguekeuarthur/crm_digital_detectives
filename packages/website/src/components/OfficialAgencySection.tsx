"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cinzel } from "../app/fonts";

export function OfficialAgencySection() {
  return (
    <section className="relative z-10 py-20 px-6 md:px-12 border-t border-[#b0944e]/20 bg-black">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 md:gap-20 mb-12">
            <div className="flex flex-col items-center w-44 md:w-48">
              <div className="relative h-36 w-36 md:h-40 md:w-40 flex items-center justify-center mb-4">
                <Image
                  src="/images/onarp.avif"
                  alt="ONARP - Association suisse des détectives privés"
                  fill
                  className="object-contain object-center"
                  sizes="160px"
                />
              </div>
              <span className="font-clash text-xs text-gray-500 uppercase tracking-widest text-center min-h-[2rem]">
                Membre ONARP
              </span>
            </div>
          </div>

          <p className="text-[#b0944e] font-clash font-semibold uppercase tracking-[0.12em] text-xs md:text-sm mb-6 leading-relaxed max-w-3xl mx-auto">
            Agence officielle de détective privé en Suisse agréée par les autorités du canton de
            Genève
          </p>

          <h2 className={`text-xl md:text-2xl font-bold text-white mb-6 ${cinzel.className}`}>
            Une agence <span className="text-[#b0944e]">agréée</span> et reconnue
          </h2>

          <div className="w-12 h-px bg-[#b0944e]/50 mx-auto mb-8" />

          <div className="space-y-5 text-gray-300 font-clash font-light leading-relaxed text-base md:text-lg max-w-3xl mx-auto">
            <p>
              Notre agence de détective privé est agréée par le Conseil d&apos;État genevois et
              membre de plusieurs associations internationales d&apos;investigateurs.
            </p>
            <p>
              Nous pouvons investiguer partout et disposons d&apos;un très large réseau
              d&apos;enquêteurs et partenaires en Suisse comme à l&apos;étranger.
            </p>
            <p className="text-white/90">
              En choisissant DigitalDetectives, vous faites appel à une agence de détective alliant
              expérience terrain, outils digitaux sécurisés et expertise d&apos;anciens policiers
              suisses.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
