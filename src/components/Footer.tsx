"use client";

import { Mail, MessageCircle } from "lucide-react";

interface FooterProps {
  accentColor?: string;
}

export function Footer({ accentColor = "ruby" }: FooterProps) {
  return (
    <footer className="py-6 border-t border-white/10 bg-black/50 backdrop-blur-md relative z-10">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-1">
          <p className="text-white font-black tracking-widest text-3xl">SPOTLIGHT</p>
          <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">© 2026 Spotlight — Onde a gestão brilha.</p>
        </div>

        <div className="flex flex-col items-center gap-2">
           <p className="text-xs font-black tracking-tight text-white/60 uppercase">
             Spotlight - Caio Marques
           </p>
           <div className={`w-10 h-1 bg-${accentColor} rounded-full`} style={!['ruby', 'purple-500'].includes(accentColor) ? { backgroundColor: accentColor } : {}} />
        </div>

        <div className="flex items-center gap-6">
          <a href="https://wa.me/5521974026883" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all hover:scale-110">
            <MessageCircle className="w-5 h-5" />
          </a>
          <a href="https://www.linkedin.com/in/caio-marques-682446234/" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
          </a>
          <a href="mailto:dev.caio.marques@gmail.com" className="p-2.5 bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all hover:scale-110">
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
