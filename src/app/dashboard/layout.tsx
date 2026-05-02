"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Menu, X, Loader2, AlertTriangle } from "lucide-react";
import { UpdateModal } from "@/components/UpdateModal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const params = useParams();
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

      setAuthenticated(true);
      setAuthorized(true);
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
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 font-sans">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin text-ruby" />
          <p className="text-sm font-black uppercase tracking-widest">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !authorized) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans relative text-foreground">
      {/* Sidebar - Desktop static, Mobile absolute/sliding */}
      <div className={`
        fixed inset-y-0 left-0 z-[9999] md:z-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0 z-10">
        {/* Mobile Header */}
        <header className="h-20 border-b border-zinc-200 bg-zinc-900 flex items-center px-4 md:hidden shrink-0 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }}
            className="p-2 -ml-2 text-zinc-400 hover:border-zinc-200 rounded-md transition-colors active:scale-95"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex-1 flex justify-center -ml-8">
             <img src="/spotlight-nobg.png" alt="Spotlight" className="h-16 w-auto object-contain" />
          </div>
        </header>

        {/* Backdrop for mobile */}
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
