"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function DashboardRootPage() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      const { data: role } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', user.id)
        .single();

      if (role?.theater_id) {
        const { data: theater } = await supabase
          .from('theaters')
          .select('slug')
          .eq('id', role.theater_id)
          .single();
        
        if (theater) {
          const cleanSlug = theater.slug.replace('teatro-', '');
          router.replace(`/${cleanSlug}/dashboard`);
          return;
        }
      }
      
      router.replace("/");
    };

    redirectUser();
  }, [router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 font-sans p-4">
      <div className="flex flex-col items-center gap-4 text-zinc-500">
        <Loader2 className="w-12 h-12 animate-spin text-ruby" />
        <p className="text-sm font-medium tracking-tight">Redirecionando para seu teatro...</p>
      </div>
    </div>
  );
}
