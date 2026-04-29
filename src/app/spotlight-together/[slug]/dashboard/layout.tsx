"use client";

import { ReactNode, useEffect, useState } from "react";
import { SidebarTogether } from "@/components/SidebarTogether";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Menu, X, Loader2, Sparkles } from "lucide-react";

export default function TogetherDashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const pathname = usePathname();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/spotlight-together");
        return;
      }

      const { data: role } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', session.user.id)
        .single();

      if (!role) {
        router.replace("/spotlight-together");
        return;
      }

      const { data: theater } = await supabase
        .from('theaters')
        .select('slug')
        .eq('id', role.theater_id)
        .single();

      if (!theater) {
        router.replace("/spotlight-together");
        return;
      }

      const cleanDbSlug = theater.slug.replace('teatro-', '');
      const cleanUrlSlug = slug?.replace('teatro-', '');

      if (cleanDbSlug !== cleanUrlSlug) {
        router.replace(`/spotlight-together/${cleanDbSlug}/dashboard`);
        return;
      }

      setAuthenticated(true);
      setAuthorized(true);
      setChecking(false);
    };

    checkAccess();
  }, [router, slug]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC] dark:bg-[#050B18] font-sans">
        <div className="flex flex-col items-center gap-3 text-indigo-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-[10px] font-black tracking-[0.3em] uppercase">Sincronizando SpotlightTogether...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !authorized) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#050B18] font-sans relative text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500/30">
      <div className={`
        fixed inset-y-0 left-0 z-[9999] md:z-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarTogether onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0 z-10">
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A1120] flex items-center px-4 md:hidden shrink-0 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors active:scale-95"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex-1 flex justify-center -ml-8">
             <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center mr-2 shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-4 h-4 text-white" />
             </div>
             <span className="font-black tracking-widest text-zinc-900 dark:text-white uppercase text-xs">Together</span>
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
      </main>
    </div>
  );
}
