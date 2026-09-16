import Image from "next/image";
import Link from "next/link";
import { Phone, MapPin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black pt-20 pb-10 px-6 md:px-12 border-t border-[#b0944e]/20 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        
        {/* Colonne 1 : Marque & Réseaux sociaux */}
        <div className="flex flex-col gap-6">
          <Link href="/">
            <Image 
              src="/images/logo-blanc.svg" 
              alt="Digital Détectives" 
              width={200} 
              height={50} 
              className="w-auto h-12"
            />
          </Link>
          <div className="text-[#b0944e] font-clash font-medium text-lg uppercase tracking-widest mt-2">
            Digital Detectives
          </div>
          <p className="text-gray-400 font-clash font-light text-sm">
            Une équipe de pro au service de l’investigation
          </p>
          
          <div className="flex gap-4 mt-4">
            <a href="https://www.facebook.com/DigitalDetectivesDD" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-[#b0944e] hover:border-[#b0944e] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://www.linkedin.com/company/digitaldetectives/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-[#b0944e] hover:border-[#b0944e] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="https://www.instagram.com/digitaldetectivesdd/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-[#b0944e] hover:border-[#b0944e] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="https://www.youtube.com/@DigitalDetectives-ch" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-[#b0944e] hover:border-[#b0944e] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </a>
          </div>
        </div>

        {/* Colonne 2 : Contact */}
        <div className="flex flex-col gap-8">
          <h3 className="text-white font-clash font-semibold uppercase tracking-widest text-lg mb-2">
            Contactez-nous
          </h3>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-[#b0944e]/30 bg-[#b0944e]/10 flex items-center justify-center shrink-0 text-[#b0944e]">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-gray-400 font-clash text-xs uppercase tracking-wider mb-1">Appelez-nous</span>
              <span className="text-white font-clash font-medium">+41 22 512 02 02</span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-[#b0944e]/30 bg-[#b0944e]/10 flex items-center justify-center shrink-0 text-[#b0944e]">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-gray-400 font-clash text-xs uppercase tracking-wider mb-1">Nos bureaux</span>
              <span className="text-white font-clash font-medium">Avenue de la Praille 29,<br />1227 Carouge</span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full border border-[#b0944e]/30 bg-[#b0944e]/10 flex items-center justify-center shrink-0 text-[#b0944e]">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-gray-400 font-clash text-xs uppercase tracking-wider mb-1">Envoyez-nous un message</span>
              <span className="text-white font-clash font-medium">contact@digitaldetectives.ch</span>
            </div>
          </div>
        </div>

        {/* Colonne 3 : Horaires */}
        <div className="flex flex-col gap-6">
          <h3 className="text-white font-clash font-semibold uppercase tracking-widest text-lg mb-2">
            Horaires
          </h3>
          <ul className="space-y-4 text-gray-400 font-clash font-light text-sm">
            <li className="flex justify-between border-b border-white/5 pb-2">
              <span>Du lundi au samedi</span>
              <span className="text-white">8h00 - 18h00</span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-2">
              <span>Samedi</span>
              <span className="text-[#b0944e]">Sur rendez-vous</span>
            </li>
            <li className="flex justify-between border-b border-white/5 pb-2">
              <span>Dimanche</span>
              <span className="text-red-400/80">Fermé</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Bas de page (Mentions, Copyright) */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-clash">
          © {new Date().getFullYear()} Digital Detectives. Enquête de Vérité.
        </div>
        <div className="flex gap-6 text-xs text-gray-500 uppercase tracking-widest font-clash">
          <Link href="/mentions-legales" className="hover:text-[#b0944e] transition-colors">Mentions légales</Link>
          <Link href="/politique-de-confidentialite" className="hover:text-[#b0944e] transition-colors">Politique de confidentialité</Link>
        </div>
      </div>
    </footer>
  );
}
