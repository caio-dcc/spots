"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginComponent from "@/components/ui/LoginComponent";
import { Footer } from "@/components/Footer";
import { PricingSection } from "@/components/PricingSection";

export default function SpotlightWorkersPage() {
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
          router.push(`/${cleanSlug}/dashboard`);
          return;
        }
      }

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
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center relative z-10">
        <LoginComponent 
            title="Spotlight Workers"
            subtitle="Portal do colaborador e gestão de escalas de eventos"
            image="/teatro_ilha.png"
            accentColor="#F59E0B"
            accentRGB="245, 158, 11"
            onSubmit={handleLogin}
            loading={loading}
        />
      </main>

      <PricingSection 
        moduleName="Workers"
        plans={[
          {
            name: "Basic",
            price: "199",
            description: "Para equipes pequenas e operação simplificada.",
            accentColor: "#F59E0B",
            features: ["Até 15 Colaboradores", "Escala Digital", "Ponto via Geolocalização", "Relatório de Horas"]
          },
          {
            name: "Team",
            price: "399",
            description: "Otimize sua equipe com automação.",
            accentColor: "#F59E0B",
            isPopular: true,
            features: ["Até 50 Colaboradores", "Escalas Inteligentes", "Portal do Colaborador", "Gestão de Cachês", "Histórico de Performance"]
          },
          {
            name: "Business",
            price: "799",
            description: "Escalabilidade para grandes staffs e agências.",
            accentColor: "#F59E0B",
            features: ["Colaboradores Ilimitados", "Pagamentos Automatizados", "Controle de Múltiplas Equipes", "Analytics de Produtividade", "Suporte Prioritário"]
          }
        ]}
      />
      <Footer accentColor="#F59E0B" />
    </div>
  );
}
