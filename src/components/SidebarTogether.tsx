"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Ticket, 
  Settings,
  ChevronDown, 
  ChevronUp, 
  LogOut,
  PieChart,
  Music,
  Utensils,
  ShieldCheck,
  Star,
  X,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { TextPressure } from "./TextPressure";
import { supabase } from "@/lib/supabase";

export function SidebarTogether({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [username, setUsername] = useState("...");
  const [slug, setSlug] = useState("");
  const [spotName, setSpotName] = useState("...");
  const [availableSpots, setAvailableSpots] = useState<{id: string, slug: string, name: string}[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('username, theater_id')
        .eq('user_id', user.id);
        
      if (!roles || roles.length === 0) return;
      
      setUsername(roles[0].username || user.email || "Usuário");
      
      const theaterIds = roles.map(r => r.theater_id).filter(Boolean);
      
      if (theaterIds.length > 0) {
        const { data: theaters } = await supabase
          .from('theaters')
          .select('id, slug, name')
          .in('id', theaterIds);
          
        if (theaters && theaters.length > 0) {
          const pathParts = pathname?.split('/') || [];
          const currentSlug = pathParts.includes('spotlight-together') ? pathParts[pathParts.indexOf('spotlight-together') + 1] : (pathParts[1] || theaters[0].slug.replace('teatro-', ''));
          
          const currentTheater = theaters.find(t => t.slug.replace('teatro-', '') === currentSlug) || theaters[0];
          
          const cleanSlug = currentTheater.slug.replace('teatro-', '');
          setSlug(cleanSlug);
          
          const formattedName = currentTheater.name || `Spot ${cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1)}`;
          setSpotName(formattedName);
          
          setAvailableSpots(theaters.map(t => ({
             id: t.id,
             slug: t.slug.replace('teatro-', ''),
             name: t.name || `Spot ${t.slug.replace('teatro-', '').charAt(0).toUpperCase() + t.slug.replace('teatro-', '').slice(1)}`
          })));
        }
      }
    };
    fetchData();
  }, [pathname]);

  const isActive = (path: string) => pathname?.includes(path);
  const base = `/spotlight-together/${slug}/dashboard`;

  const NavItem = ({ href, icon: Icon, children, active }: any) => (
    <Link 
      href={href} 
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${active ? 'bg-indigo-600/10 text-indigo-500' : 'text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <Icon className={`w-[17px] h-[17px] ${active ? 'text-indigo-600' : 'text-zinc-500'}`} />
      {children}
    </Link>
  );

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-screen flex flex-col font-sans relative shadow-2xl">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-indigo-600 md:hidden z-10"><X className="w-6 h-6" /></button>

      {/* Logo Together */}
      <div className="h-28 flex flex-col items-center justify-center px-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
             <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-zinc-900 dark:text-white tracking-tighter">TOGETHER</span>
        </div>
        <span className="text-[10px] font-black text-zinc-400 mt-2 uppercase tracking-widest">Enterprise Events</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <NavItem href={base} icon={LayoutDashboard} active={pathname === base}>Painel do Evento</NavItem>
        
        <div className="pt-4">
          <p className="px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Operacional</p>
          <NavItem href={`${base}/staff`} icon={ShieldCheck} active={isActive('/staff')}>Staff e Operação</NavItem>
          <NavItem href={`${base}/buffet`} icon={Utensils} active={isActive('/buffet')}>Buffet e Bar</NavItem>
        </div>

        <div className="pt-4">
          <p className="px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Acesso</p>
          <NavItem href={`${base}/convites`} icon={Ticket} active={isActive('/convites')}>Convites e Portaria</NavItem>
          <NavItem href={`${base}/mesas`} icon={Users} active={isActive('/mesas')}>Gestão de Mesas</NavItem>
        </div>

        <div className="pt-4">
          <p className="px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Entretenimento</p>
          <NavItem href={`${base}/palco`} icon={Music} active={isActive('/palco')}>Atrações e Palco</NavItem>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4">
          <NavItem href={`${base}/configuracoes`} icon={Settings} active={isActive('/configuracoes')}>Configurações</NavItem>
        </div>
      </nav>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 relative bg-zinc-50/50 dark:bg-black/20">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-bottom-2 z-50">
            {availableSpots.length > 1 && (
              <>
                <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Seus Spots</div>
                {availableSpots.map(spot => (
                  <button key={spot.id} onClick={() => window.location.href = `/spotlight-together/${spot.slug}/dashboard`} className={`w-full flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${spot.slug === slug ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <div className="w-6 h-6 rounded bg-indigo-600 flex-shrink-0" />
                    <span className="truncate">{spot.name}</span>
                  </button>
                ))}
                <div className="my-2 border-t border-zinc-100"></div>
              </>
            )}
            <button onClick={() => window.location.href = "/spotlight-together"} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"><LogOut className="w-4 h-4" /> Sair</button>
          </div>
        )}
        <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/30">{username.charAt(0).toUpperCase()}</div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-zinc-900 dark:text-white truncate w-32 uppercase tracking-tight leading-none mb-1">{username}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold truncate w-32 uppercase tracking-widest">{spotName}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-zinc-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </aside>
  );
}
