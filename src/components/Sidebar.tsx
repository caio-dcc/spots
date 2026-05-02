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
  X,
  Building2,
  Wallet
} from "lucide-react";
import { useState, useEffect, memo } from "react";
import { supabase } from "@/lib/supabase";

export const Sidebar = memo(function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    eventos: true,
    funcionarios: true,
    convidados: true
  });
  
  const [username, setUsername] = useState("...");
  const [spotName, setSpotName] = useState("...");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const contextUserId = await getContextUserId();
      
      // Se eu for membro, quero ver o nome do "Dono" ou do Spot do dono
      let displayUser = user;
      if (contextUserId !== user.id) {
        const { data: owner } = await supabase.from('profiles').select('*').eq('id', contextUserId).single();
        if (owner) {
          // Simulando o contexto do dono
          setSpotName(`${owner.full_name || 'Spot de Equipe'}`);
        }
      }

      const displayName = user.user_metadata?.full_name 
        || user.user_metadata?.name
        || user.email?.split('@')[0] 
        || 'Usuário';
      
      if (contextUserId === user.id) {
        const spotLabel = user.email?.split('@')[1]?.split('.')[0] || 'Meu Spot';
        setSpotName(spotLabel.charAt(0).toUpperCase() + spotLabel.slice(1));
      }
      
      setUsername(displayName);
    };
    fetchData();
  }, []);

  const isActive = (path: string) => pathname?.includes(path);
  const base = '/dashboard';

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col font-sans relative">
      {/* Botão fechar mobile */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-ruby md:hidden z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Logo */}
      <div className="h-28 flex flex-col items-center justify-center px-6 bg-sidebar">
        <img src="/spotlight-nobg.png" alt="Spotlight" className="h-[65px] w-auto object-contain" />
        <span className="text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-[0.3em]">Versão 0.0.2</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <Link 
          href={base} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${pathname === base ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <LayoutDashboard className={`w-[17px] h-[17px] ${pathname === base ? 'text-ruby' : 'text-zinc-600'}`} />
          Visão Geral
        </Link>

        {/* Dropdown Funcionários */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <Users className="w-[17px] h-[17px] text-zinc-600" />
              Funcionários
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/funcionarios/listar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Listar</Link>
            <Link href={`${base}/funcionarios/cadastrar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Eventos */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <Calendar className="w-[17px] h-[17px] text-zinc-600" />
              Eventos
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/eventos/listar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Listar</Link>
            <Link href={`${base}/eventos/cadastrar`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Convidados */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <Star className="w-[17px] h-[17px] text-zinc-600" />
              Convidados
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/convidados/gerar-lista`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Gerar Lista</Link>
            <Link href={`${base}/convidados/checkin`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Check-in Online</Link>
          </div>
        </div>
        
        <Link 
          href={`${base}/locais`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${pathname === `${base}/locais` ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5 mt-2'}`}
        >
          <Building2 className={`w-[17px] h-[17px] ${pathname === `${base}/locais` ? 'text-ruby' : 'text-zinc-600'}`} />
          Locais
        </Link>

        <Link 
          href={`${base}/calendario`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/calendario') ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5 mt-2'}`}
        >
          <Calendar className={`w-[17px] h-[17px] ${isActive('/calendario') ? 'text-ruby' : 'text-zinc-600'}`} />
          Calendário
        </Link>
        
        <Link 
          href={`${base}/relatorios`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/relatorios') ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <PieChart className={`w-[17px] h-[17px] ${isActive('/relatorios') ? 'text-ruby' : 'text-zinc-600'}`} />
          Relatórios
        </Link>
        
        <Link 
          href={`${base}/configuracoes`} 
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/configuracoes') ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <Settings className={`w-[17px] h-[17px] ${isActive('/configuracoes') ? 'text-ruby' : 'text-zinc-600'}`} />
          Configurações
        </Link>
      </nav>

      {/* User Dropdown */}
      <div className="p-4 relative bg-sidebar">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-zinc-200 rounded-[1.5rem] shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 z-50 font-sans max-h-64 overflow-y-auto">
            

            <button 
              onClick={() => window.location.href = "/"}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ruby hover:bg-ruby/5 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ruby text-white flex items-center justify-center font-black text-xs shadow-lg shadow-ruby/20">
              {username.charAt(0).toUpperCase() || 'T'}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-black text-foreground uppercase tracking-widest truncate w-32">{username}</p>
              <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter truncate w-32">{spotName}</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </aside>
  );
});

