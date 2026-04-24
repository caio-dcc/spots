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
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 font-sansation">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
        <p className="text-sm font-medium uppercase tracking-wider">Redirecionando para seu teatro...</p>
      </div>
    </div>
  );
}
