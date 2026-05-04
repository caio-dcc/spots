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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spotlight_theme');
      return (saved === 'light' || saved === 'dark') ? (saved as 'dark' | 'light') : 'dark';
    }
    return 'dark';
  });
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

  useEffect(() => {
    const savedTheme = localStorage.getItem('spotlight_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme as 'dark' | 'light');
    }
    
    // Listen for custom event from settings
    const handleThemeChange = (e: any) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener('spotlight-theme-change', handleThemeChange);
    return () => window.removeEventListener('spotlight-theme-change', handleThemeChange);
  }, []);

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
    <div 
      className={`flex h-screen w-full overflow-hidden font-sans relative flex-col md:flex-row transition-colors duration-500 ${theme === 'dark' ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'}`}
      data-theme={theme}
    >
      {theme === 'dark' && (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-zinc-900 z-0 animate-in fade-in duration-1000" />
      )}

      {/* Mobile Header - High Z-Index to stay above sidebar */}
      <header className={`h-24 border-b flex items-center px-4 md:hidden shrink-0 z-[11000] shadow-lg sticky top-0 w-full transition-colors ${theme === 'dark' ? 'border-white/10 bg-black' : 'border-zinc-200 bg-white'}`}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 -ml-2 rounded-md transition-colors active:scale-95 cursor-pointer relative z-[11001] ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          {isSidebarOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
        <div className="flex-1 flex flex-col items-center justify-center -ml-8">
           <img src="/spotlight-nobg.png" alt="Spotlight" className="h-14 w-auto object-contain" />
           <span className={`text-[10px] font-black uppercase tracking-[0.2em] -mt-1 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Modo Casa</span>
        </div>
      </header>

      {/* Sidebar - Desktop static, Mobile absolute/sliding */}
      <div className={`
        fixed inset-y-0 left-0 z-[9999] md:z-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0 z-10 bg-transparent">
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
