"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginComponent from "@/components/ui/LoginComponent";
import { Footer } from "@/components/Footer";
import { PricingSection } from "@/components/PricingSection";

export default function SpotlightTogetherPage() {
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
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center relative z-10">
        <LoginComponent 
            title="Spotlight Together"
            subtitle="Gestão de convites e monetização de eventos"
            image="/teatro_ilha.png"
            accentColor="#4F46E5"
            accentRGB="79, 70, 229"
            onSubmit={handleLogin}
            loading={loading}
        />
      </main>

      <PricingSection 
        moduleName="Together"
        plans={[
          {
            name: "Light",
            price: "299",
            description: "Para pequenos eventos e listas de convidados.",
            accentColor: "#4F46E5",
            features: ["Até 300 Convidados", "Link de Convite Único", "Check-in via App", "Relatório de Presença"]
          },
          {
            name: "Growth",
            price: "599",
            description: "Aumente sua escala com monetização integrada.",
            accentColor: "#4F46E5",
            isPopular: true,
            features: ["Até 1500 Convidados", "Venda de Convites (Pix)", "Gestão de Comissários", "QR Code Dinâmico", "Dashboard de Vendas"]
          },
          {
            name: "Elite",
            price: "1.299",
            description: "Gestão VIP para grandes produções e festivais.",
            accentColor: "#4F46E5",
            features: ["Convidados Ilimitados", "Customização de Checkout", "Concierge Exclusivo", "Integração CRM", "Múltiplas Listas de Acesso"]
          }
        ]}
      />
      <Footer accentColor="#4F46E5" />
    </div>
  );
}
