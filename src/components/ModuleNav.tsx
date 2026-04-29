"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Grainient from "./ui/grainient";

export function ModuleNav() {
  const pathname = usePathname();
  
  // Hide on dashboard pages
  if (pathname?.includes('/dashboard')) return null;

  const getThemeColors = () => {
    if (pathname === '/spotlight-show') {
      return { c1: '#9B111E', c2: '#6A0D15', c3: '#B22222' };
    }
    if (pathname === '/spotlight-together') {
      return { c1: '#4F46E5', c2: '#312E81', c3: '#6366F1' };
    }
    if (pathname === '/spotlight-workers') {
      return { c1: '#F59E0B', c2: '#78350F', c3: '#FBBF24' };
    }
    return { c1: '#7C3AED', c2: '#4C1D95', c3: '#8B5CF6' };
  };

  const colors = getThemeColors();

  return (
    <div className="h-[120px] flex flex-col items-center justify-center gap-0 w-full whitespace-nowrap relative overflow-hidden pt-[10px]">
      {/* Dynamic Grainient Background */}
      <div className="absolute inset-0 z-0">
        <Grainient 
          color1={colors.c1}
          color2={colors.c2}
          color3={colors.c3}
          timeSpeed={0.1}
          grainAmount={0.05}
          className="opacity-20"
        />
        {/* Subtle Bottom Border Shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/10" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-1">
        <img 
          src="/spotlight-nobg.png" 
          alt="Spotlight Logo" 
          className="w-[168px] h-[72px] object-contain opacity-90 transition-all hover:opacity-100"
        />
        
        <div className="flex items-center gap-3 md:gap-6 p-3 bg-transparent transition-all mb-[20px]">
          <Link href="/">
            <button className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer ${pathname === '/' ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}>
              Início
            </button>
          </Link>

          <div className="w-[1px] h-3 bg-white/10 mx-0" />

          <Link href="/spotlight-show">
            <button className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer ${pathname === '/spotlight-show' ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}>
              Show
            </button>
          </Link>

          <div className="w-[1px] h-3 bg-white/10 mx-0" />

          <Link href="/spotlight-together">
            <button className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer ${pathname === '/spotlight-together' ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}>
              Together
            </button>
          </Link>

          <div className="w-[1px] h-3 bg-white/10 mx-0" />

          <Link href="/spotlight-workers">
            <button className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 cursor-pointer ${pathname === '/spotlight-workers' ? 'text-white opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}>
              Workers
            </button>
          </Link>

          <div className="w-[1px] h-3 bg-white/20 mx-2" />

          <Link href="/faq">
            <button className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer ${pathname === '/faq' ? 'text-white opacity-100' : 'text-white opacity-20 hover:opacity-100'}`}>
              F.A.Q
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
