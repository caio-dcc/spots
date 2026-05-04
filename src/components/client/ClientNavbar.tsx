"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, Package, AlertCircle } from "lucide-react";

interface ClientNavbarProps {
  userEmail?: string;
}

export function ClientNavbar({ userEmail }: ClientNavbarProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error: any) {
      alert(error.message || "Erro ao fazer logout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="w-full bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition" onClick={() => router.push("/mosaico-eventos")}>
            <img src="/spotlight-nobg.png" alt="Spotlight" className="h-8 w-8" />
            <span className="font-bold text-white hidden sm:inline">Spotlight</span>
          </div>

          {/* Menu Items */}
          <div className="flex items-center gap-6">
            {/* Meus Pedidos */}
            <button
              onClick={() => router.push("/meus-pedidos")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Meus Pedidos</span>
            </button>

            {/* Reportar Problema */}
            <button
              onClick={() => router.push("/mosaico-eventos#report")}
              className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Suporte</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ruby/20 hover:bg-ruby/30 text-white transition text-sm disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{loading ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </div>

        {/* Email do usuário logado (opcional) */}
        {userEmail && (
          <div className="text-xs text-white/50 pb-2">
            Logado como: {userEmail}
          </div>
        )}
      </div>
    </nav>
  );
}
