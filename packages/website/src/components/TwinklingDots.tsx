"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Dot {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function TwinklingDots() {
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    // Génère 320 à 480 points pour un scintillement doré plus dense
    const generateDots = () => {
      const newDots: Dot[] = [];
      const numDots = Math.floor(Math.random() * 160) + 320;

      for (let i = 0; i < numDots; i++) {
        newDots.push({
          id: i,
          x: Math.random() * 100, // %
          y: Math.random() * 100, // %
          size: Math.random() * 4 + 2, // Taille entre 2px et 6px
          duration: Math.random() * 3 + 2, // Durée d'animation entre 2s et 5s
          delay: Math.random() * 2, // Délai entre 0s et 2s
        });
      }
      setDots(newDots);
    };

    generateDots();
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute rounded-full bg-[#b0944e]"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: Math.random() * 0.45 + 0.35,
            boxShadow: `0 0 ${dot.size * 4}px rgba(212, 175, 55, 0.95)`, // Effet de lueur (glow)
            filter: "blur(0.4px)",
            mixBlendMode: "screen",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
