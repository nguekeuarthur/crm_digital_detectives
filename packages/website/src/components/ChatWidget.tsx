"use client";

import { X, Maximize2, Paperclip, Send, Minimize2, Bot } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface ChatWidgetProps {
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'agent' | 'bot';
  text: string;
  timestamp: Date;
}

type BotState = 'WELCOME' | 'PARTICULIERS' | 'ENTREPRISES' | 'MENACE_INTERNE' | 'MENACE_EXTERNE' | 'AUTRES_SERVICES' | 'HUMAN_HANDOFF';

interface Scenario {
  message: string;
  options: { label: string; nextState: BotState }[];
}

const SCENARIOS: Record<BotState, Scenario> = {
  WELCOME: {
    message: "Bonjour et bienvenue chez Digital Detectives ! Que recherchez-vous aujourd'hui ?",
    options: [
      { label: "Services aux particuliers", nextState: "PARTICULIERS" },
      { label: "Services aux entreprises", nextState: "ENTREPRISES" },
      { label: "Autres services", nextState: "AUTRES_SERVICES" },
      { label: "Parler à un agent", nextState: "HUMAN_HANDOFF" }
    ]
  },
  PARTICULIERS: {
    message: "Voici nos services pour les particuliers. Sur quel sujet souhaitez-vous échanger ?",
    options: [
      { label: "Infidélité", nextState: "HUMAN_HANDOFF" },
      { label: "Divorce", nextState: "HUMAN_HANDOFF" },
      { label: "Pension alimentaire / Garde d'enfants", nextState: "HUMAN_HANDOFF" },
      { label: "Addictions et comportements à risque", nextState: "HUMAN_HANDOFF" },
      { label: "Problèmes de voisinage", nextState: "HUMAN_HANDOFF" },
      { label: "Harcèlement et menaces", nextState: "HUMAN_HANDOFF" },
      { label: "Retour", nextState: "WELCOME" }
    ]
  },
  ENTREPRISES: {
    message: "De quel type de menace est victime votre entreprise ?",
    options: [
      { label: "Menace interne", nextState: "MENACE_INTERNE" },
      { label: "Menace externe", nextState: "MENACE_EXTERNE" },
      { label: "Retour", nextState: "WELCOME" }
    ]
  },
  MENACE_INTERNE: {
    message: "Voici nos interventions pour les menaces internes :",
    options: [
      { label: "Vol et fraude interne", nextState: "HUMAN_HANDOFF" },
      { label: "Détournement de fonds", nextState: "HUMAN_HANDOFF" },
      { label: "Moralité des employés", nextState: "HUMAN_HANDOFF" },
      { label: "Menaces et tentatives d'extorsion", nextState: "HUMAN_HANDOFF" },
      { label: "Retour", nextState: "ENTREPRISES" }
    ]
  },
  MENACE_EXTERNE: {
    message: "Voici nos interventions pour les menaces externes :",
    options: [
      { label: "Concurrence déloyale", nextState: "HUMAN_HANDOFF" },
      { label: "Espionnage industriel", nextState: "HUMAN_HANDOFF" },
      { label: "Contrefaçons", nextState: "HUMAN_HANDOFF" },
      { label: "Enquête commerciale", nextState: "HUMAN_HANDOFF" },
      { label: "Retour", nextState: "ENTREPRISES" }
    ]
  },
  AUTRES_SERVICES: {
    message: "Voici nos autres services :",
    options: [
      { label: "Prévention des vols", nextState: "HUMAN_HANDOFF" },
      { label: "Renseignements immobiliers", nextState: "HUMAN_HANDOFF" },
      { label: "Surveillance de domicile", nextState: "HUMAN_HANDOFF" },
      { label: "Protection de la sphère privée", nextState: "HUMAN_HANDOFF" },
      { label: "E-réputation", nextState: "HUMAN_HANDOFF" },
      { label: "Sensibilisation des employés", nextState: "HUMAN_HANDOFF" },
      { label: "Retour", nextState: "WELCOME" }
    ]
  },
  HUMAN_HANDOFF: {
    message: "Je vous mets en relation avec un membre de notre équipe. Veuillez décrire brièvement votre situation, un enquêteur va vous répondre.",
    options: []
  }
};

export function ChatWidget({ onClose }: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [botState, setBotState] = useState<BotState>("WELCOME");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: SCENARIOS.WELCOME.message,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate or retrieve visitor ID
    let vid = localStorage.getItem("dd_visitor_id");
    if (!vid) {
      vid = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("dd_visitor_id", vid);
    }
    const visitorId = vid;

    const ws = new WebSocket("ws://localhost:3000/ws");

    ws.onopen = () => {
      console.log("Connecté au chat en tant que visiteur anonyme", visitorId);
      ws.send(JSON.stringify({ type: "chat:join", data: { role: "visitor", visitorId } }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat:message") {
          setMessages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            sender: msg.data.sender, // 'agent' usually
            text: msg.data.text,
            timestamp: new Date()
          }]);
          // Si un agent répond, on passe le bot en silencieux
          setBotState("HUMAN_HANDOFF");
        }
      } catch (error) {
        console.error("Erreur de parsing WS:", error);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botState]);

  const handleOptionClick = (option: { label: string; nextState: BotState }) => {
    // Ajouter la réponse de l'utilisateur
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text: option.label,
      timestamp: new Date()
    };
    
    // Si c'est un handoff, on l'envoie au backend (CRM)
    if (option.nextState === "HUMAN_HANDOFF" && socket?.readyState === WebSocket.OPEN) {
      const visitorId = localStorage.getItem("dd_visitor_id");
      socket.send(JSON.stringify({ 
        type: "chat:message", 
        data: { text: "Le client a sélectionné : " + option.label, sender: "bot_event", visitorId } 
      }));
    }

    // Mettre à jour l'état du bot et ajouter son message
    setBotState(option.nextState);
    const botMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "bot",
      text: SCENARIOS[option.nextState].message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !socket) return;
    
    const newMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text: inputText,
      timestamp: new Date()
    };
    
    // Si l'utilisateur tape un message libre, on bascule en mode Humain automatiquement
    if (botState !== "HUMAN_HANDOFF") {
      setBotState("HUMAN_HANDOFF");
      setMessages(prev => [...prev, newMsg, {
        id: Math.random().toString(36).substring(7),
        sender: "bot",
        text: SCENARIOS.HUMAN_HANDOFF.message,
        timestamp: new Date()
      }]);
    } else {
      setMessages(prev => [...prev, newMsg]);
    }
    
    if (socket.readyState === WebSocket.OPEN) {
      const visitorId = localStorage.getItem("dd_visitor_id");
      socket.send(JSON.stringify({ 
        type: "chat:message", 
        data: { text: inputText, sender: "user", visitorId } 
      }));
    }
    
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSendMessage();
  };

  const currentOptions = SCENARIOS[botState]?.options || [];

  return (
    <div 
      className={`fixed z-[100] bottom-4 md:bottom-6 right-4 md:right-24 bg-white rounded-t-xl rounded-b-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 border border-gray-200 ${
        isExpanded ? "w-[90vw] md:w-[600px] h-[80vh] md:h-[700px]" : "w-[90vw] md:w-[380px] h-[600px] max-h-[85vh]"
      }`}
    >
      {/* Header */}
      <div className="bg-[#cdb584] px-4 py-4 flex items-center justify-between shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm border border-gray-100">
            <Image 
              src="/images/logo-couleur.svg" 
              alt="Digital Detectives" 
              width={40} 
              height={40} 
              className="w-full h-auto opacity-90"
            />
          </div>
          <div>
            <h3 className="font-semibold text-[#1e2a3b] text-base font-clash leading-tight">
              Votre équipe DigitalDetectives
            </h3>
            <span className="text-xs text-[#1e2a3b]/70 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 block"></span>
              {botState === "HUMAN_HANDOFF" ? "Un agent vous répond" : "Assistant Automatique"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#1e2a3b]">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            title={isExpanded ? "Réduire" : "Agrandir"}
          >
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-black/5 rounded transition-colors"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 bg-gray-50/50 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, index) => (
          <div 
            key={msg.id + index} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
          >
            {(msg.sender === 'bot' || msg.sender === 'agent') && (
              <div className="w-8 h-8 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-1 pb-1.5">
                {msg.sender === 'agent' ? (
                   <Image src="/images/logo-couleur.svg" alt="Agent" width={24} height={24} className="w-full h-auto" />
                ) : (
                   <Bot className="w-5 h-5 text-[#cdb584]" />
                )}
              </div>
            )}
            <div 
              className={`px-4 py-3 text-[15px] leading-relaxed max-w-[85%] shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-[#cdb584] text-white rounded-2xl rounded-br-sm' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Options / Quick Replies du Bot */}
        {currentOptions.length > 0 && (
          <div className="pl-10 flex flex-col gap-2 items-start mt-2">
            {currentOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleOptionClick(opt)}
                className="text-left px-4 py-2 text-sm bg-white border border-[#cdb584] text-[#cdb584] hover:bg-[#cdb584] hover:text-white rounded-full transition-colors shadow-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Footer */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex flex-col items-center">
        <div className="relative w-full flex items-center mb-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={botState === "HUMAN_HANDOFF" ? "Écrivez votre message..." : "Demandez-moi n'importe quoi..."}
            className="w-full pl-5 pr-20 py-3.5 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:bg-white focus:border-[#cdb584] focus:ring-1 focus:ring-[#cdb584] transition-all shadow-inner placeholder:text-gray-400"
          />
          <div className="absolute right-3 flex items-center gap-2">
            <button className="text-gray-400 hover:text-gray-600 p-1">
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="text-[#cdb584] hover:text-[#b0944e] p-1 disabled:opacity-50 disabled:hover:text-[#cdb584] transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <span className="text-[11px] text-gray-400">
          Protection anti-spam activée
        </span>
      </div>
    </div>
  );
}
