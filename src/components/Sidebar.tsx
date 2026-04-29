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
  User,
  PieChart,
  ClipboardList,
  Star,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { TextPressure } from "./TextPressure";
import { supabase } from "@/lib/supabase";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    eventos: true,
    funcionarios: true,
    convidados: true
  });
  
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
          const currentSlug = pathname?.split('/')[1] || theaters[0].slug.replace('teatro-', '');
          const currentTheater = theaters.find(t => t.slug.replace('teatro-', '') === currentSlug) || theaters[0];
          
          const cleanSlug = currentTheater.slug.replace('teatro-', '');
          setSlug(cleanSlug);
          
          const formattedName = currentTheater.name || `Teatro ${cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1)}`;
          setSpotName(formattedName);
          
          setAvailableSpots(theaters.map(t => ({
             id: t.id,
             slug: t.slug.replace('teatro-', ''),
             name: t.name || `Teatro ${t.slug.replace('teatro-', '').charAt(0).toUpperCase() + t.slug.replace('teatro-', '').slice(1)}`
          })));
        }
      }
    };
    fetchData();
  }, []);

  const isActive = (path: string) => pathname?.includes(path);
  const base = slug ? `/${slug}/dashboard` : '/dashboard';

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-screen flex flex-col font-sans relative">
      {/* Botão fechar mobile */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-ruby md:hidden z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Logo */}
      <div className="h-28 flex flex-col items-center justify-center px-6 border-b border-zinc-100 dark:border-zinc-800">
        <img src="/spotlight-nobg.png" alt="Spotlight" className="h-[65px] w-auto object-contain" />
        <span className="text-[10px] font-black text-zinc-500 mt-2 uppercase tracking-widest">Versão 0.0.2</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <Link 
          href={base} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${pathname === base ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <LayoutDashboard className={`w-[17px] h-[17px] ${pathname === base ? 'text-ruby' : 'text-zinc-500'}`} />
          Visão Geral
        </Link>

        {/* Dropdown Eventos */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Calendar className="w-[17px] h-[17px] text-zinc-500" />
              Eventos
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/eventos/listar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Listar</Link>
            <Link href={`${base}/eventos/cadastrar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Funcionários */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Users className="w-[17px] h-[17px] text-zinc-500" />
              Funcionários
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/funcionarios/listar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Listar</Link>
            <Link href={`${base}/funcionarios/cadastrar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Convidados */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Star className="w-[17px] h-[17px] text-zinc-500" />
              Convidados
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/convidados/gerar-lista`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Gerar Lista</Link>
            <Link href={`${base}/convidados/checkin`} onClick={onClose} className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Check-in Online</Link>
          </div>
        </div>

        <Link 
          href={`${base}/calendario`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/calendario') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100 dark:hover:bg-zinc-800 mt-2'}`}
        >
          <Calendar className={`w-[17px] h-[17px] ${isActive('/calendario') ? 'text-ruby' : 'text-zinc-500'}`} />
          Calendário
        </Link>
        
        <Link 
          href={`${base}/relatorios`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/relatorios') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <PieChart className={`w-[17px] h-[17px] ${isActive('/relatorios') ? 'text-ruby' : 'text-zinc-500'}`} />
          Relatórios
        </Link>
        
        <Link 
          href={`${base}/configuracoes`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/configuracoes') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <Settings className={`w-[17px] h-[17px] ${isActive('/configuracoes') ? 'text-ruby' : 'text-zinc-500'}`} />
          Configurações
        </Link>
      </nav>

      {/* User Dropdown */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 relative">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-bottom-2 z-50 font-sans max-h-64 overflow-y-auto">
            
            {availableSpots.length > 1 && (
              <>
                <div className="px-2 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Seus Spots
                </div>
                {availableSpots.map(spot => (
                  <button 
                    key={spot.id}
                    onClick={() => {
                       window.location.href = `/${spot.slug}/dashboard`;
                    }}
                    className={`w-full flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${spot.slug === slug ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                  >
                    <div className="w-6 h-6 rounded bg-zinc-200 flex-shrink-0 overflow-hidden relative">
                       {/* Placeholder para foto do spot */}
                       <div className="absolute inset-0 bg-gradient-to-br from-zinc-300 to-zinc-400"></div>
                    </div>
                    <span className="truncate">{spot.name}</span>
                  </button>
                ))}
                <div className="my-2 border-t border-zinc-100"></div>
              </>
            )}

            <button 
              onClick={() => window.location.href = "/"}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ruby text-white flex items-center justify-center font-bold text-sm">
              {username.charAt(0).toUpperCase() || 'T'}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate w-32">{username}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold truncate w-32">{spotName}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-zinc-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </aside>
  );
}

// Helper para os links fecharem a sidebar no mobile
function SidebarLink({ href, children, isActive, onClick }: any) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100'}`}
    >
      {children}
    </Link>
  );
}
