"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, Loader2, AlertTriangle } from "lucide-react";
import { UpdateModal } from "@/components/UpdateModal";

export default function TheaterDashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/");
        return;
      }

      // NOVO: Validação por userId e Subscription (Módulo THEATER)
      // Verifica se o usuário tem permissão na tabela user_access (conforme novo script SQL)
      const { data: access, error } = await supabase
        .from('user_access')
        .select('entity_id')
        .eq('user_id', session.user.id)
        .eq('module_type', 'THEATER')
        .eq('is_paid', true)
        .single();

      if (error || !access) {
        // Fallback para user_roles por compatibilidade enquanto migra
        const { data: role } = await supabase
          .from('user_roles')
          .select('theater_id')
          .eq('user_id', session.user.id)
          .single();

        if (!role) {
          router.replace("/");
          return;
        }
      }

      setAuthenticated(true);
      setChecking(false);
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 font-sans">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin text-ruby" />
          <p className="text-sm font-medium tracking-tight">Validando acesso ao Módulo Theater...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-zinc-950 font-sans relative text-zinc-900 dark:text-zinc-100">
      <div className={`
        fixed inset-y-0 left-0 z-[9999] md:z-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0 z-10">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center px-4 md:hidden shrink-0 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="p-2 -ml-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors active:scale-95"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex-1 flex justify-center -ml-8">
             <img src="/icon.png" alt="Spotlight" className="w-6 h-6 mr-2" />
             <span className="font-bold tracking-widest text-zinc-900 dark:text-white">Spotlight</span>
          </div>
        </header>

        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] md:hidden animate-in fade-in duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        <UpdateModal />
      </main>
    </div>
  );
}
