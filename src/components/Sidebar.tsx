"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  LogOut,
  PieChart,
  Star,
  X,
  Building2,
  Wallet,
  FileText,
  ShoppingCart
} from "lucide-react";
import { useState, useEffect, memo } from "react";
import { supabase } from "@/lib/supabase";

export const Sidebar = memo(function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [username, setUsername] = useState("...");
  const [spotName, setSpotName] = useState("...");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { getContextUserId } = await import("@/lib/auth-context");
      const contextUserId = await getContextUserId();
      
      // Busca o perfil do usuário logado
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (contextUserId !== user.id) {
        const { data: owner } = await supabase.from('profiles').select('*').eq('id', contextUserId).single();
        if (owner) {
          // Simulando o contexto do dono
          setSpotName(`${owner.full_name || 'Spot de Equipe'}`);
        }
      }

      const displayName = userProfile?.full_name
        || user.user_metadata?.full_name 
        || user.user_metadata?.name
        || (user.email === 'dev.caio.marques@gmail.com' ? 'Caio Marques' : user.email?.split('@')[0])
        || 'Usuário';
      
      // Busca configurações da organização para o nome do Spot
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('org_name')
        .eq('user_id', contextUserId)
        .single();

      if (orgSettings?.org_name) {
        setSpotName(orgSettings.org_name);
      } else if (contextUserId === user.id) {
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

      <div className="h-32 flex flex-col items-center justify-center px-6 bg-sidebar">
        <img src="/spotlight-nobg.png" alt="Spotlight" className="h-[60px] w-auto object-contain" />
        <div className="flex flex-col items-center mt-2">
          <span className="text-ruby font-black text-[11px] uppercase tracking-[0.2em]">Modo Casa</span>
          <span className="text-[8px] font-black text-black uppercase tracking-[0.3em] mt-[10px]">Versão 0.0.5</span>
        </div>
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
            <Link href={`${base}/eventos/checkin`} onClick={onClose} className="block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest text-zinc-600 hover:text-ruby hover:bg-ruby/5 transition-all">- Check-in</Link>
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

        {/* Financeiro */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 cursor-pointer hover:bg-white/5 transition-all">
            <div className="flex items-center gap-3">
              <Wallet className="w-[17px] h-[17px] text-zinc-600" />
              Financeiro
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href={`${base}/eventos/despesas`} onClick={onClose} className={`block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/eventos/despesas') ? 'text-ruby' : 'text-zinc-600 hover:text-ruby hover:bg-ruby/5'}`}>- Despesas</Link>
            <Link href={`${base}/financeiro/notas`} onClick={onClose} className={`block px-3 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/financeiro/notas') ? 'text-ruby' : 'text-zinc-600 hover:text-ruby hover:bg-ruby/5'}`}>
              - Notas & Recibos
              <span className="ml-1.5 text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-black">NOVO</span>
            </Link>
          </div>
        </div>

        {/* Venda Online */}
        <Link
          href={`${base}/vendas`}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all mt-2 ${isActive('/vendas') ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <ShoppingCart className={`w-[17px] h-[17px] ${isActive('/vendas') ? 'text-ruby' : 'text-zinc-600'}`} />
          Vendas
          <span className="ml-auto text-[8px] bg-ruby/10 text-ruby px-1.5 py-0.5 rounded-full font-black">NOVO</span>
        </Link>

        <Link
          href={`${base}/configuracoes`}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${pathname === `${base}/configuracoes` ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <Settings className={`w-[17px] h-[17px] ${pathname === `${base}/configuracoes` ? 'text-ruby' : 'text-zinc-600'}`} />
          Configurações
        </Link>

        <Link
          href={`${base}/configuracoes/organizacao`}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${isActive('/configuracoes/organizacao') ? 'bg-ruby/10 text-ruby shadow-lg shadow-ruby/5' : 'text-zinc-500 hover:text-ruby hover:bg-white/5'}`}
        >
          <FileText className={`w-[17px] h-[17px] ${isActive('/configuracoes/organizacao') ? 'text-ruby' : 'text-zinc-600'}`} />
          Organização
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

