import React from 'react';
import { motion } from 'framer-motion';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = i * 0.15;
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: "tween", duration: 1.5, ease: "easeInOut" },
        opacity: { delay, duration: 0.1 }
      }
    };
  }
};

const SVGWrapper = ({ children, className = "", strokeWidth = 2 }: any) => (
  <motion.svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    initial="hidden"
    animate="visible"
  >
    {children}
  </motion.svg>
);

export const IconParticuliers = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="8" r="3.4"/>
              <motion.path variants={draw} custom={1} d="M5.5 20c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/>
  </SVGWrapper>
);

export const IconEntreprises = (props: any) => (
  <SVGWrapper {...props}>
      <motion.rect variants={draw} custom={0} x="3" y="8" width="18" height="11" rx="1.5"/>
              <motion.path variants={draw} custom={1} d="M8.5 8V6.5A1.5 1.5 0 0 1 10 5h4a1.5 1.5 0 0 1 1.5 1.5V8"/>
              <motion.path variants={draw} custom={2} d="M3 13h18"/>
  </SVGWrapper>
);

export const IconAutres = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="12" r="9"/>
              <motion.path variants={draw} custom={1} d="M15.2 8.8l-2.1 5.4-5.4 2.1 2.1-5.4z"/>
  </SVGWrapper>
);

export const IconInfidelite = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 20s-7.5-4.6-9.3-9.6C1.6 6.9 3.9 4 7 4c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.1 0 5.4 2.9 4.3 6.4C19.5 15.4 12 20 12 20z"/>
              <motion.path variants={draw} custom={1} d="M10.3 8l1.9 3-2.1 2 2.3 3.4"/>
  </SVGWrapper>
);

export const IconDivorce = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="7.5" cy="14.5" r="4"/>
              <motion.circle variants={draw} custom={1} cx="17" cy="9.5" r="4"/>
  </SVGWrapper>
);

export const IconGardePension = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="9" cy="7" r="3"/>
              <motion.path variants={draw} custom={1} d="M4 20c0-3.8 2.2-6 5-6s5 2.2 5 6"/>
              <motion.circle variants={draw} custom={2} cx="18" cy="12" r="2"/>
              <motion.path variants={draw} custom={3} d="M15 20c0-2.6 1.3-4 3-4s3 1.4 3 4"/>
  </SVGWrapper>
);

export const IconAddictions = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M19 7.5A8 8 0 1 0 20 14"/>
              <motion.path variants={draw} custom={1} d="M19 7.5l3-1.2M19 7.5l1.4 2.8"/>
  </SVGWrapper>
);

export const IconVoisinage = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M1 21V10L5.5 3L10 10V21"/>
              <motion.path variants={draw} custom={1} d="M14 21V10L18.5 3L23 10V21"/>
              <motion.path variants={draw} custom={2} d="M12 21V6"/>
  </SVGWrapper>
);

export const IconHarcelement = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
              <motion.path variants={draw} custom={1} d="M12 9v3.5"/>
              <motion.path variants={draw} custom={2} d="M12 15.6v.01"/>
  </SVGWrapper>
);

export const IconVolFraude = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M9 8a3 3 0 0 1 6 0"/>
              <motion.path variants={draw} custom={1} d="M6 8h12l1.4 11.2a1.2 1.2 0 0 1-1.2 1.3H5.8a1.2 1.2 0 0 1-1.2-1.3L6 8z"/>
              <motion.path variants={draw} custom={2} d="M10 12l4 4M14 12l-4 4"/>
  </SVGWrapper>
);

export const IconDetournement = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="9" cy="14" r="5"/>
              <motion.path variants={draw} custom={1} d="M9 11v6"/>
              <motion.path variants={draw} custom={2} d="M14 9l6-6M20 3h-4M20 3v4"/>
  </SVGWrapper>
);

export const IconMoraliteEmployes = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
              <motion.path variants={draw} custom={1} d="M14 3v4h4"/>
              <motion.path variants={draw} custom={2} d="M7.5 12.8l1.6 1.6L12.5 11"/>
  </SVGWrapper>
);

export const IconExtorsionInterne = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M3 6h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>
              <motion.path variants={draw} custom={1} d="M3 6l9 7 9-7"/>
              <motion.path variants={draw} custom={2} d="M12 15v2"/>
              <motion.path variants={draw} custom={3} d="M12 18.5v.01"/>
  </SVGWrapper>
);

export const IconConcurrence = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M4 8a8 8 0 0 1 13-4"/>
              <motion.path variants={draw} custom={1} d="M17 2v3.5h-3.5"/>
              <motion.path variants={draw} custom={2} d="M20 16a8 8 0 0 1-13 4"/>
              <motion.path variants={draw} custom={3} d="M7 22v-3.5h3.5"/>
  </SVGWrapper>
);

export const IconEspionnage = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="8" cy="17" r="3.2"/>
              <motion.circle variants={draw} custom={1} cx="16" cy="17" r="3.2"/>
              <motion.path variants={draw} custom={2} d="M9.5 12.5h5"/>
              <motion.path variants={draw} custom={3} d="M9 12.5L7.5 6h2.2l1 6"/>
              <motion.path variants={draw} custom={4} d="M15 12.5l1.5-6.5h-2.2l-1 6"/>
  </SVGWrapper>
);

export const IconContrefacon = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="9" r="6"/>
              <motion.path variants={draw} custom={1} d="M9 14.5L7 21l5-2.5L17 21l-2-6.5"/>
              <motion.path variants={draw} custom={2} d="M6.5 3.5l11 11"/>
  </SVGWrapper>
);

export const IconEnqueteCommerciale = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M4 20v-6"/>
              <motion.path variants={draw} custom={1} d="M10 20V9"/>
              <motion.path variants={draw} custom={2} d="M16 20v-4"/>
              <motion.circle variants={draw} custom={3} cx="17" cy="6" r="3"/>
              <motion.path variants={draw} custom={4} d="M19.2 8.2L21.3 10.3"/>
  </SVGWrapper>
);

export const IconPreventionVols = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M9 8a3 3 0 0 1 6 0"/>
              <motion.path variants={draw} custom={1} d="M6 8h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9L6 8z"/>
              <motion.path variants={draw} custom={2} d="M8.7 13.3c1-1.3 2.1-2 3.3-2s2.3.7 3.3 2c-1 1.3-2.1 2-3.3 2s-2.3-.7-3.3-2z"/>
              <motion.path variants={draw} custom={3} d="M12 13.3v.01"/>
  </SVGWrapper>
);

export const IconRenseignementsImmobiliers = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M3 11L12 4l9 7"/>
              <motion.path variants={draw} custom={1} d="M5 10v10h14V10"/>
              <motion.path variants={draw} custom={2} d="M10.3 14.2a1.8 1.8 0 1 1 2.4 1.7c-.7.3-1 .7-1 1.4"/>
              <motion.path variants={draw} custom={3} d="M12 19.7v.01"/>
  </SVGWrapper>
);

export const IconSurveillanceDomicile = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M3 11L12 4l9 7"/>
              <motion.path variants={draw} custom={1} d="M5 10v10h14V10"/>
              <motion.path variants={draw} custom={2} d="M12 4V2.4"/>
              <motion.circle variants={draw} custom={3} cx="12" cy="1.7" r="0.01"/>
              <motion.circle variants={draw} custom={4} cx="12" cy="1.9" r="1"/>
  </SVGWrapper>
);

export const IconProtectionPrivee = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 3l7 3v6c0 5-3.2 8-7 9-3.8-1-7-4-7-9V6l7-3z"/>
              <motion.path variants={draw} custom={1} d="M12 9l1.1 2.2 2.4.35-1.75 1.7.4 2.4L12 14.5l-2.15 1.15.4-2.4-1.75-1.7 2.4-.35z"/>
  </SVGWrapper>
);

export const IconEReputation = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="10" cy="11" r="7"/>
              <motion.path variants={draw} custom={1} d="M3 11h14"/>
              <motion.path variants={draw} custom={2} d="M10 4c2.5 2 2.5 12 0 14M10 4c-2.5 2-2.5 12 0 14"/>
              <motion.path variants={draw} custom={3} d="M16 14l4 1.6v3c0 2.6-1.7 4-4 4.6-2.3-.6-4-2-4-4.6v-3z"/>
              <motion.path variants={draw} custom={4} d="M14.3 18.3l1.3 1.3 2.4-2.6"/>
  </SVGWrapper>
);

export const IconSensibilisation = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 4L2 9l10 5 10-5-10-5z"/>
              <motion.path variants={draw} custom={1} d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>
              <motion.path variants={draw} custom={2} d="M22 9v6"/>
  </SVGWrapper>
);

export const IconLocal = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 21s-6.5-5.7-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.3-6.5 11-6.5 11z"/>
              <motion.path variants={draw} custom={1} d="M12 9.8v.01"/>
              <motion.circle variants={draw} custom={2} cx="12" cy="9.8" r="1.2"/>
  </SVGWrapper>
);

export const IconNational = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M6 3v18"/>
              <motion.path variants={draw} custom={1} d="M6 4c2-1.4 4-1.4 6 0s4 1.4 6 0V13c-2 1.4-4 1.4-6 0s-4-1.4-6 0"/>
  </SVGWrapper>
);

export const IconInternational = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="12" r="8.5"/>
              <motion.path variants={draw} custom={1} d="M3.5 12h17"/>
              <motion.path variants={draw} custom={2} d="M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>
  </SVGWrapper>
);

export const IconSimple = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="8" r="3.2"/>
              <motion.path variants={draw} custom={1} d="M6 20c0-4 2.7-6.5 6-6.5s6 2.5 6 6.5"/>
  </SVGWrapper>
);

export const IconProtected = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="9" cy="8" r="2.8"/>
              <motion.path variants={draw} custom={1} d="M3.8 20c0-3.6 2.3-5.9 5.2-5.9 1 0 1.9.3 2.7.8"/>
              <motion.circle variants={draw} custom={2} cx="18" cy="15.5" r="3.2"/>
              <motion.path variants={draw} custom={3} d="M18 13.7v2.4"/>
              <motion.path variants={draw} custom={4} d="M18 17.7v.01"/>
  </SVGWrapper>
);

export const IconPublicFigure = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="9.5" r="3.2"/>
              <motion.path variants={draw} custom={1} d="M6 21c0-4 2.7-6.5 6-6.5s6 2.5 6 6.5"/>
              <motion.path variants={draw} custom={2} d="M12 1.5l.8 1.7 1.9.25-1.4 1.35.3 1.9L12 5.8l-1.6.9.3-1.9-1.4-1.35 1.9-.25z"/>
  </SVGWrapper>
);

export const IconUrban = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M3 21V9h4v12"/>
              <motion.path variants={draw} custom={1} d="M9 21V5h5v16"/>
              <motion.path variants={draw} custom={2} d="M16 21V11h5v10"/>
  </SVGWrapper>
);

export const IconRural = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 3c-2.6 0-4.5 2-4.5 4.4 0 1 .3 1.9.9 2.6A4 4 0 0 0 12 17a4 4 0 0 0 3.6-6.9c.6-.7.9-1.6.9-2.6C16.5 5 14.6 3 12 3z"/>
              <motion.path variants={draw} custom={1} d="M12 17v4"/>
              <motion.path variants={draw} custom={2} d="M4 21c3-2 13-2 16 0"/>
  </SVGWrapper>
);

export const IconHostile = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M12 3.5L22 20.5H2z"/>
              <motion.path variants={draw} custom={1} d="M12 10v4.5"/>
              <motion.path variants={draw} custom={2} d="M12 17.5v.01"/>
  </SVGWrapper>
);

export const IconStandard = (props: any) => (
  <SVGWrapper {...props}>
      <motion.circle variants={draw} custom={0} cx="12" cy="12" r="9"/>
              <motion.path variants={draw} custom={1} d="M8 12.3l2.6 2.6L16.5 9"/>
  </SVGWrapper>
);

export const IconComplex = (props: any) => (
  <SVGWrapper {...props}>
      <motion.path variants={draw} custom={0} d="M13 2L4 14h6l-1 8 10-13h-6l1-7z"/>
  </SVGWrapper>
);

export const CustomIconMap: Record<string, React.FC<any>> = {
  "particuliers": IconParticuliers,
  "entreprises": IconEntreprises,
  "autres": IconAutres,
  "infidelite": IconInfidelite,
  "divorce": IconDivorce,
  "garde-pension": IconGardePension,
  "addictions": IconAddictions,
  "voisinage": IconVoisinage,
  "harcelement": IconHarcelement,
  "vol-fraude": IconVolFraude,
  "detournement": IconDetournement,
  "moralite-employes": IconMoraliteEmployes,
  "extorsion-interne": IconExtorsionInterne,
  "concurrence": IconConcurrence,
  "espionnage": IconEspionnage,
  "contrefacon": IconContrefacon,
  "enquete-commerciale": IconEnqueteCommerciale,
  "prevention-vols": IconPreventionVols,
  "renseignements-immobiliers": IconRenseignementsImmobiliers,
  "surveillance-domicile": IconSurveillanceDomicile,
  "protection-privee": IconProtectionPrivee,
  "e-reputation": IconEReputation,
  "sensibilisation": IconSensibilisation,
  "local": IconLocal,
  "national": IconNational,
  "international": IconInternational,
  "simple": IconSimple,
  "protected": IconProtected,
  "public_figure": IconPublicFigure,
  "urban": IconUrban,
  "rural": IconRural,
  "hostile": IconHostile,
  "standard": IconStandard,
  "complex": IconComplex,
};
