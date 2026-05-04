"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ShieldCheck,
  LogOut,
  ChevronUp,
  X,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";

type AdminSidebarProps = {
  email: string;
  onClose?: () => void;
};

const NAV = [
  { href: "/admin/view", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/view/control-organizers", label: "Organizadores", icon: Users },
  { href: "/admin/view/clientes", label: "Clientes", icon: ShoppingCart },
  { href: "/admin/view/financeiro", label: "Financeiro · Stripe", icon: Wallet },
];

export function AdminSidebar({ email, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.replace("/admin/view/login");
      router.refresh();
    }
  }

  return (
    <aside className="w-64 h-screen flex flex-col font-sans relative bg-zinc-950 border-r border-zinc-900">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-ruby md:hidden z-10"
        aria-label="Fechar menu"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="h-32 flex flex-col items-center justify-center px-6 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-ruby" />
          <span className="text-zinc-100 font-black text-sm uppercase tracking-[0.2em]">
            Master
          </span>
        </div>
        <span className="text-ruby font-black text-[10px] uppercase tracking-[0.25em] mt-2">
          Spotlight Console
        </span>
        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] mt-2">
          Versão 0.0.5
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${
                active
                  ? "bg-ruby/15 text-ruby shadow-lg shadow-ruby/10"
                  : "text-zinc-500 hover:text-ruby hover:bg-white/5"
              }`}
            >
              <Icon
                className={`w-[17px] h-[17px] ${
                  active ? "text-ruby" : "text-zinc-600"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 relative border-t border-zinc-900">
        {menuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ruby hover:bg-ruby/10 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full flex items-center justify-between p-2 hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-ruby text-white flex items-center justify-center font-black text-xs shadow-lg shadow-ruby/20">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] font-black text-zinc-200 uppercase tracking-widest truncate">
                Super Admin
              </p>
              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-tight truncate">
                {email}
              </p>
            </div>
            <ChevronUp
              className={`w-4 h-4 text-zinc-500 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      </div>
    </aside>
  );
}
