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
  PieChart
} from "lucide-react";
import { useState, useEffect } from "react";
import { TextPressure } from "./TextPressure";
import { supabase } from "@/lib/supabase";

export function Sidebar() {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    eventos: true,
    funcionarios: true,
    convidados: true
  });
  
  const [username, setUsername] = useState("Carregando...");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase
        .from('user_roles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      setUsername(role?.username || user.email || "Usuário");
    };
    fetchUsername();
  }, []);

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white h-screen flex flex-col hidden md:flex">
      {/* Logo */}
      <div className="h-20 flex items-center justify-center px-6 border-b border-zinc-100 gap-3">
        <img src="/favicon.png" alt="SpotMe Logo" className="w-8 h-8 object-contain" />
        <TextPressure text="SpotMe" />
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <Link 
          href="/dashboard" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${pathname === '/dashboard' ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100'}`}
        >
          <LayoutDashboard className={`w-[17px] h-[17px] ${pathname === '/dashboard' ? 'text-ruby' : 'text-zinc-500'}`} />
          Visão Geral
        </Link>

        {/* Dropdown Eventos */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50">
            <div className="flex items-center gap-3">
              <Calendar className="w-[17px] h-[17px] text-zinc-500" />
              Eventos
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href="/dashboard/eventos/listar" className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Listar</Link>
            <Link href="/dashboard/eventos/cadastrar" className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Funcionários */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50">
            <div className="flex items-center gap-3">
              <Users className="w-[17px] h-[17px] text-zinc-500" />
              Funcionários
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href="/dashboard/funcionarios/listar" className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Listar</Link>
            <Link href="/dashboard/funcionarios/cadastrar" className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Cadastrar</Link>
          </div>
        </div>

        {/* Dropdown Convidados */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold not-italic text-ruby cursor-pointer hover:bg-zinc-50">
            <div className="flex items-center gap-3">
              <Ticket className="w-[17px] h-[17px] text-zinc-500" />
              Convidados
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-1 ml-9 space-y-1">
            <Link href="/dashboard/convidados/gerar-lista" className="block px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-ruby hover:bg-ruby/5 font-medium">- Gerar Lista</Link>
          </div>
        </div>

        <Link 
          href="/dashboard/calendario" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/dashboard/calendario') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100 mt-2'}`}
        >
          <Calendar className={`w-[17px] h-[17px] ${isActive('/dashboard/calendario') ? 'text-ruby' : 'text-zinc-500'}`} />
          Calendário
        </Link>
        
        <Link 
          href="/dashboard/relatorios" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/dashboard/relatorios') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100'}`}
        >
          <PieChart className={`w-[17px] h-[17px] ${isActive('/dashboard/relatorios') ? 'text-ruby' : 'text-zinc-500'}`} />
          Relatórios
        </Link>
        
        <Link 
          href="/dashboard/configuracoes" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold not-italic transition-colors ${isActive('/dashboard/configuracoes') ? 'bg-ruby/10 text-ruby' : 'text-ruby hover:bg-zinc-100'}`}
        >
          <Settings className={`w-[17px] h-[17px] ${isActive('/dashboard/configuracoes') ? 'text-ruby' : 'text-zinc-500'}`} />
          Configurações
        </Link>
      </nav>

      {/* User Dropdown */}
      <div className="p-4 border-t border-zinc-200 relative">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-zinc-200 rounded-lg shadow-lg p-2 animate-in fade-in slide-in-from-bottom-2 z-50">
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
          className="w-full flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ruby text-white flex items-center justify-center font-bold text-sm">
              {username.charAt(0).toUpperCase() || 'T'}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-zinc-900 truncate w-32">{username}</p>
              <p className="text-xs text-zinc-500">Administrador</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-zinc-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>
    </aside>
  );
}
