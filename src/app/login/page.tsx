"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginComponent from "@/components/ui/LoginComponent";
import { Footer } from "@/components/Footer";
import { KillExcelSection } from "@/components/KillExcelSection";

export default function SpotlightShowPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      if (!user) throw new Error("Usuário não encontrado");

      // Redireciona para o dashboard principal
      router.push("/dashboard");
    } catch (error: any) {
      alert(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center relative z-10 pt-[60px]">
        <LoginComponent 
            title="Spotlight"
            subtitle="Gestão operacional inteligente para eventos"
            image="/evento.png"
            accentColor="#9B111E"
            accentRGB="155, 17, 30"
            onSubmit={handleLogin}
            loading={loading}
        />
      </main>

      <KillExcelSection />
      <Footer accentColor="#9B111E" />
    </div>
  );
}
