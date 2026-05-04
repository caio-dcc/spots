"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("spotlight_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("spotlight_cookie_consent", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 z-[100] max-w-md w-[calc(100vw-3rem)]"
        >
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center border border-ruby/20">
                  <Cookie className="w-5 h-5 text-ruby" />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Aviso de Cookies</h3>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-white/40 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-white/60 text-[11px] leading-relaxed font-medium">
              Utilizamos tecnologias de armazenamento local para garantir uma experiência segura e personalizada. Ao continuar, você concorda com nossa política de privacidade.
            </p>

            <div className="flex gap-3">
              <button
                onClick={acceptCookies}
                className="flex-1 bg-white text-black font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all hover:bg-zinc-200 cursor-pointer active:scale-95"
              >
                Aceitar e Continuar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
