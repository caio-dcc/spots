"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NextImage from "next/image";
import { supabase } from "@/lib/supabase";
import { 
  Menu, 
  X, 
  UserCircle, 
  Building, 
  ChevronDown,
  ShoppingBag,
  ShieldQuestion,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ModuleNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [firstName, setFirstName] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.full_name) {
          setFirstName(profile.full_name.split(' ')[0]);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        if (profile?.full_name) setFirstName(profile.full_name.split(' ')[0]);
      } else {
        setFirstName("");
      }
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    const { toast } = await import('sonner');
    await supabase.auth.signOut();
    toast.success("Sessão encerrada com sucesso");
    window.location.href = "/";
  };

  // Hide on dashboard pages
  if (pathname?.includes('/dashboard')) return null;

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Para Clientes', href: isLoggedIn ? '/mosaico-eventos' : '/login' },
    ...(!isLoggedIn ? [{ label: 'Para Organizadores', href: '/house/login' }] : []),
    { label: 'F.A.Q', href: '/faq' },
    { label: 'Sobre', href: '/sobre' },
  ];

  const isHome = pathname === "/";

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-8 py-6 flex items-center justify-between ${
          scrolled || !isHome ? "bg-black/60 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent"
        }`}
      >
        {/* Left Links - Decreased font size by 5px (from 17px to 12px) */}
        <div className="hidden md:flex items-center gap-8 text-[12px] font-black uppercase tracking-[0.2em] text-white/50">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className="relative py-2 group/nav"
              >
                <span className={`${isActive ? 'text-white' : 'text-white/50 group-hover/nav:text-white'} transition-colors duration-300`}>
                  {link.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-ruby"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Center Logo - Added icon.png next to text */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 group">
          <NextImage 
            src="/icon.png" 
            alt="Logo" 
            width={55} 
            height={55} 
            className="object-contain brightness-125 transition-transform group-hover:scale-110" 
          />
          <span className="text-xl font-black uppercase tracking-[0.4em] text-white">Spotlight</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsOpen(true)}
          className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>        {/* Right Actions - Also updated Log in font size to 12px */}
        <div className="flex items-center gap-6">
          {!isLoggedIn ? (
            <>
              <Link 
                href="/login" 
                className="text-[12px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors md:block hidden"
              >
                Log in
              </Link>
              
              <div className="group relative">
                <button className="px-6 py-3 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                  Registrar-se
                  <ChevronDown className="w-3 h-3 transition-transform duration-300 group-hover:rotate-180" />
                </button>
                
                {/* Dropdown */}
                <div className="absolute top-full right-0 pt-4 w-64 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300">
                  <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 shadow-2xl overflow-hidden">
                    <Link href="/login">
                      <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-ruby/20 flex items-center justify-center border border-ruby/30">
                          <UserCircle className="w-5 h-5 text-ruby" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Sou Cliente</span>
                          <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-tighter">Quero comprar</span>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="h-[1px] bg-white/5 my-1 mx-4" />

                    <Link href="/house/login">
                      <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Building className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Organizador</span>
                          <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-tighter">Quero gerenciar</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="group relative">
              <button className="flex items-center gap-3 text-white hover:text-ruby transition-all duration-300 cursor-pointer">
                <span className="text-[12px] font-black uppercase tracking-widest hidden sm:block">
                  Olá, {firstName}
                </span>
                <div className="w-8 h-8 rounded-full bg-ruby/20 border border-ruby/30 flex items-center justify-center">
                  <UserCircle className="w-4 h-4 text-ruby" />
                </div>
                <ChevronDown className="w-3 h-3 text-white/50 group-hover:rotate-180 transition-transform duration-300" />
              </button>

              <div className="absolute top-full right-0 pt-4 w-64 opacity-0 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[110]">
                <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden">
                  <Link href="/meus-pedidos" className="block">
                    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Meus Pedidos</span>
                        <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-tighter">Histórico de compras</span>
                      </div>
                    </div>
                  </Link>

                  <Link href="/reportar-problema" className="block">
                    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white">
                        <ShieldQuestion className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Suporte</span>
                        <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-tighter">Reportar problema</span>
                      </div>
                    </div>
                  </Link>

                  <div className="h-[1px] bg-white/5 my-2 mx-4" />

                  <button onClick={handleLogout} className="w-full">
                    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-ruby/10 group/logout transition-all cursor-pointer text-left">
                      <div className="w-10 h-10 rounded-xl bg-ruby/20 flex items-center justify-center border border-ruby/30 text-ruby">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-ruby text-[10px] font-black uppercase tracking-widest text-left">Sair</span>
                        <span className="text-ruby/60 text-[9px] uppercase font-bold tracking-tighter text-left">Encerrar sessão</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-zinc-950 border-l border-white/10 z-[1001] flex flex-col"
            >
              <div className="p-8 flex justify-between items-center border-b border-white/5">
                <span className="text-lg font-black uppercase tracking-[0.3em] text-white">Menu</span>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white/5 rounded-xl text-white/70 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-8">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-8 py-6 text-sm font-black uppercase tracking-[0.3em] text-white/50 hover:text-white hover:bg-white/5 transition-all border-b border-white/5"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {!isLoggedIn && (
                <div className="p-8 bg-white/5 border-t border-white/5">
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <button className="w-full py-4 rounded-full bg-white text-black font-black uppercase tracking-widest text-[10px]">
                      Acessar Conta
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
