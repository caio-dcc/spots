"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    const checkAccess = async () => {
      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/");
        return;
      }

      // Verificar se o usuário tem permissão para este teatro (slug)
      const { data: role } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', session.user.id)
        .single();

      if (!role) {
        router.replace("/");
        return;
      }

      const { data: theater } = await supabase
        .from('theaters')
        .select('slug')
        .eq('id', role.theater_id)
        .single();

      if (!theater) {
        router.replace("/");
        return;
      }

      const cleanDbSlug = theater.slug.replace('teatro-', '');
      const cleanUrlSlug = slug?.replace('teatro-', '');

      if (cleanDbSlug !== cleanUrlSlug) {
        // Redireciona para o slug correto se tentar acessar outro
        router.replace(`/${cleanDbSlug}/dashboard`);
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
  }, [router, slug]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 font-sansation">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin text-ruby" />
          <p className="text-sm font-medium uppercase tracking-widest">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !authorized) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 font-sansation">
      {/* Sidebar on the LEFT for standard premium UX */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
