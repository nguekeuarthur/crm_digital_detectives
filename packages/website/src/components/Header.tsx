import Image from "next/image";
import { Headset, Languages, User, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="w-full h-24 relative z-50 flex items-center justify-between px-8 md:px-16 bg-black">
      {/* LOGO */}
      <div className="flex items-center">
        <div className="w-[140px] md:w-[200px]">
          <Image 
            src="/images/logo-header.svg"
            alt="Digital Detectives"
            width={240}
            height={80}
            className="w-full h-auto object-contain cursor-pointer hover:scale-105 transition-transform duration-500"
            priority
          />
        </div>
      </div>
      
      {/* NAVIGATION DROITE */}
      <div className="hidden md:flex items-center gap-10 h-full">
        {/* AIDE */}
        <div className="group relative flex flex-col items-center justify-center cursor-pointer">
          <div className="w-10 h-10 flex items-center justify-center text-white/60 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:-translate-y-1">
            <Headset className="w-5 h-5" strokeWidth={1} />
          </div>
          <span className="absolute top-full mt-1 text-[#b0944e] font-light tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">AIDE</span>
        </div>

        {/* LANGUE */}
        <div className="group relative flex flex-col items-center justify-center cursor-pointer">
          <div className="w-10 h-10 flex items-center justify-center text-white/60 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:-translate-y-1">
            <Languages className="w-5 h-5" strokeWidth={1} />
          </div>
          <span className="absolute top-full mt-1 text-[#b0944e] font-light tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">FRANÇAIS</span>
        </div>

        {/* MON ESPACE */}
        <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="group relative flex flex-col items-center justify-center cursor-pointer">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-black bg-[#b0944e] group-hover:scale-105 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.4)]">
            <User className="w-4 h-4" strokeWidth={2} />
          </div>
          <span className="absolute top-full mt-3 text-[#b0944e] font-medium tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 ease-out whitespace-nowrap pointer-events-none">MON ESPACE</span>
        </a>

        {/* MENU */}
        <div className="group relative flex flex-col items-center justify-center cursor-pointer ml-4">
          <div className="w-12 h-12 flex items-center justify-center text-white/50 group-hover:text-[#b0944e] transition-all duration-500 ease-out group-hover:rotate-90">
            <Menu className="w-8 h-8" strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* MOBILE MENU ICON */}
      <div className="md:hidden flex items-center text-white/50 hover:text-[#b0944e] cursor-pointer transition-colors">
        <Menu className="w-8 h-8" strokeWidth={1.5} />
      </div>
    </header>
  );
}
