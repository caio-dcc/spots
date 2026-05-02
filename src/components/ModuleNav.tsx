"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Grainient from "./ui/grainient";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ModuleNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  
  // Hide on dashboard pages
  if (pathname?.includes('/dashboard')) return null;

  const getThemeColors = () => {
    if (pathname === '/login') {
      return { c1: '#9B111E', c2: '#6A0D15', c3: '#B22222' };
    }
    return { c1: '#7C3AED', c2: '#4C1D95', c3: '#8B5CF6' };
  };

  const colors = getThemeColors();

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Acessar Spotlight', href: '/login' },
    { label: 'F.A.Q', href: '/faq' },
  ];

  return (
    <div className="h-[80px] flex items-center w-full whitespace-nowrap relative overflow-hidden px-8">
      {/* Dynamic Grainient Background */}
      <div className="absolute inset-0 z-0">
        <Grainient 
          color1={colors.c1}
          color2={colors.c2}
          color3={colors.c3}
          timeSpeed={0.1}
          grainAmount={0.05}
          className="opacity-10"
        />
        {/* Subtle Bottom Border Shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5" />
      </div>

      <div className="relative z-10 flex items-center w-full h-full">
        {/* Logo Left */}
        <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
          <button 
            onClick={() => setIsOpen(true)}
            className="lg:hidden text-white hover:text-white/80 transition-colors p-2 cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/" className="cursor-pointer shrink-0">
            <img 
              src="/spotlight-nobg.png" 
              alt="Spotlight Logo" 
              className="w-[180px] md:w-[280px] h-[60px] md:h-[100px] object-contain opacity-90 transition-all hover:opacity-100 cursor-pointer"
            />
          </Link>
        </div>
        
        {/* Menu Center (Desktop) */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-12 bg-transparent transition-all h-full">
          {navLinks.map((link, idx) => (
            <React.Fragment key={link.href}>
              <Link href={link.href}>
                <button className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer ${pathname === link.href ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}>
                  {link.label}
                </button>
              </Link>
              {idx < navLinks.length - 1 && <div className="w-[1px] h-3 bg-white/10 mx-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-[300px] bg-zinc-950 border-r border-white/10 z-[70] p-8 flex flex-col gap-12"
            >
              <div className="flex items-center justify-between">
                <img src="/icon.png" alt="Icon" className="w-8 h-8" />
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <button className={`text-xl font-black uppercase tracking-tighter text-left w-full transition-all ${pathname === link.href ? 'text-white' : 'text-white/40 hover:text-white'}`}>
                      {link.label}
                    </button>
                  </Link>
                ))}
              </div>

              <div className="mt-auto pt-8 border-t border-white/5">
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-relaxed">
                  Spotlight<br />
                  © 2026 Todos os direitos reservados.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
