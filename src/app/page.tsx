"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { BlurText } from "@/components/ui/BlurText";
import { 
  Check
} from "lucide-react";
import { EventMosaic } from "@/components/EventMosaic";
import { FeaturesSection } from "@/components/FeaturesSection";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    });

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setAuthChecked(true);
    };
    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col relative bg-black selection:bg-ruby selection:text-white">
      {/* Hero Section */}
      <main className="relative min-h-screen flex flex-col justify-center px-8 md:px-20 overflow-hidden py-20 md:py-32">
        {/* Background Image with Cinematic Lighting */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/bailarina.png" 
            alt="Hero Background" 
            className="w-full h-full object-cover object-[center_30%] opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Content */}
          <div className="space-y-8 transition-all duration-700 order-2 lg:order-1">
            <div className="flex items-center gap-2 text-white/70">
              <Check className="w-4 h-4 text-ruby" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Plataforma Profissional</span>
            </div>

            <BlurText
              text="Gestão de Eventos, Shows e Bilheteria para Produtores Culturais"
              className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase break-words"
              delay={50}
              animateBy="words"
              direction="bottom"
            />

            <p className="text-white/60 text-lg md:text-xl font-medium leading-relaxed max-w-lg">
              A <span className="text-white">Spotlight</span> é a ferramenta definitiva para organizadores de eventos. Tenha o <span className="text-white">controle total de freelancers, diárias e staff</span> em um fluxo profissional e integrado.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {authChecked && !isLoggedIn && (
                <Link href="/login" className="w-full sm:w-auto">
                  <button className="w-full px-10 py-5 rounded-full bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-zinc-200 cursor-pointer active:scale-95 shadow-xl shadow-white/5">
                    Registrar-se
                  </button>
                </Link>
              )}
              <Link href="/mosaico-eventos" className="w-full sm:w-auto">
                <button className="w-full px-10 py-5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:bg-white/20 cursor-pointer active:scale-95">
                  Ver Eventos
                </button>
              </Link>
            </div>
          </div>

          {/* Right Column: Spinner */}
          <div className="relative flex items-center justify-center order-1 lg:order-2 h-[300px] md:h-[500px]">
            <div className="relative w-[280px] h-[280px] md:w-[420px] md:h-[420px] flex items-center justify-center opacity-80 pointer-events-none transition-all duration-700">
              {/* Circular Text Spinner */}
              <div className="absolute inset-0 animate-[spin_30s_linear_infinite]">
                <svg viewBox="0 0 490 490" className="w-full h-full">
                  <path
                    id="circlePathHero"
                    d="M 245, 245 m -180, 0 a 180,180 0 1,1 360,0 a 180,180 0 1,1 -360,0"
                    fill="transparent"
                  />
                  <text className="fill-white text-[24px] font-black uppercase tracking-[0.4em]">
                    <textPath xlinkHref="#circlePathHero">
                      Spotlight • Cultura • Arte • Gestão • Bilheteria • 
                    </textPath>
                  </text>
                </svg>
              </div>
              
              {/* Central Logo */}
              <div className="relative z-20 flex items-center justify-center">
                <img 
                  src="/icon.png" 
                  alt="Spotlight Icon Center" 
                  className="w-[130px] h-[130px] md:w-[260px] md:h-[260px] object-contain brightness-150 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar - Centered and Separator removed */}
        <div className="relative md:absolute md:bottom-12 left-0 md:left-0 right-0 md:right-0 z-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 pt-10 md:pt-12 mt-20 md:mt-0 px-8 md:px-0">
          <div className="space-y-1 text-center">
            <p className="text-white text-lg md:text-xl font-black tracking-tight">Tempo Real</p>
            <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Controle instantâneo</p>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-white text-lg md:text-xl font-black tracking-tight">Segurança</p>
            <p className="text-white/40 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Dados protegidos</p>
          </div>
        </div>
      </main>

      {/* Rest of the content - Background set to black explicitly */}
      <div className="bg-black relative z-10">
        <FeaturesSection />
        <EventMosaic />
      </div>

      <Footer accentColor="#810B14" />
    </div>
  );
}
