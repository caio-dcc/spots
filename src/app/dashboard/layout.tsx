"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      setAuthenticated(true);
      setChecking(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-medium">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 font-sansation">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Right Sidebar */}
      <Sidebar />
    </div>
  );
}
