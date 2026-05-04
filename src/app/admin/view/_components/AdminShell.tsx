"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 font-sans relative text-zinc-100 flex-col md:flex-row">
      <header className="h-20 border-b border-zinc-900 bg-zinc-950 flex items-center px-4 md:hidden shrink-0 z-[11000] sticky top-0 w-full">
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 -ml-2 text-zinc-300 hover:text-white rounded-md transition-colors active:scale-95 cursor-pointer relative z-[11001]"
          aria-label="Menu"
        >
          {open ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-ruby" />
          <span className="text-zinc-100 font-black text-sm uppercase tracking-[0.2em]">
            Master Console
          </span>
        </div>
        <div className="w-9" />
      </header>

      <div
        className={`fixed inset-y-0 left-0 z-[9999] md:z-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar email={email} onClose={() => setOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0 z-10">
        {open && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
