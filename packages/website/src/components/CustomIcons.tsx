import { UserRound, Home, Heart, Lightbulb, UsersRound, TrendingUp, Wrench, Shield, Puzzle } from "lucide-react";

export function ParticuliersIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <Heart className="absolute w-full h-full opacity-30 stroke-current" strokeWidth={2.5} />
      <Home className="absolute w-3/4 h-3/4 opacity-60 stroke-current" strokeWidth={2} />
      <UserRound className="absolute w-1/2 h-1/2 mt-3 stroke-current" strokeWidth={2.5} />
    </div>
  );
}

export function EntreprisesIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <Lightbulb className="absolute w-full h-full opacity-30 stroke-current" strokeWidth={2.5} />
      <TrendingUp className="absolute w-3/4 h-3/4 mb-3 ml-2 opacity-60 stroke-current" strokeWidth={2} />
      <UsersRound className="absolute w-1/2 h-1/2 mt-5 stroke-current" strokeWidth={2.5} />
    </div>
  );
}

export function ServicesIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <Shield className="absolute w-full h-full opacity-30 stroke-current" strokeWidth={2.5} />
      <Wrench className="absolute w-3/4 h-3/4 mb-3 mr-3 opacity-60 stroke-current transform -rotate-45" strokeWidth={2} />
      <Puzzle className="absolute w-1/2 h-1/2 mt-4 ml-4 stroke-current" strokeWidth={2.5} />
    </div>
  );
}
