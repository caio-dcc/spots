"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminRegisterComponent from "@/components/ui/AdminRegisterComponent";
import { Footer } from "@/components/Footer";
import { getUserType } from "@/lib/auth-helpers";
import { toast } from "sonner";

export default function AdminLoginPage() {
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

      const userType = await getUserType();
      if (userType !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Apenas administradores podem acessar.");
      }

      router.push("/dashboard");
      toast.success("Bem-vindo ao painel!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: {
    email: string;
    password: string;
    organizerName: string;
    organizationName: string;
    whatsapp: string;
    requestQuote: boolean;
  }) => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.organizerName,
            organization_name: data.organizationName,
            phone_number: data.whatsapp,
            user_type: "admin",
          }
        }
      });

      if (error) throw error;
      if (!user) throw new Error("Erro ao criar conta");

      // Try manual update, ignore RLS/Trigger conflict errors
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            full_name: data.organizerName,
            phone_number: data.whatsapp,
            user_type: "admin",
            organization_name: data.organizationName,
          });
      } catch (e) {
        console.log("Profile created via trigger or RLS restricted manual update");
      }

      // If requesting quote, send notification (in real app, this would send email)
      if (data.requestQuote) {
        // Log the request to audit trail
        await supabase
          .from("audit_logs")
          .insert({
            user_id: user.id,
            action: "REQUEST_QUOTE",
            entity_type: "organization",
            entity_id: user.id,
            before_value: null,
            after_value: {
              organization: data.organizationName,
              organizer: data.organizerName,
              whatsapp: data.whatsapp,
            },
          });
      }

      // Show success message (component will display the success state)
      toast.success("Conta criada com sucesso! Você pode fazer login agora.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center relative z-10 pt-[80px] pb-32">
        <AdminRegisterComponent
            accentColor="#810B14"
            accentRGB="129, 11, 20"
            onLoginSubmit={handleLogin}
            onRegisterSubmit={handleRegister}
            loading={loading}
            image="/bailarina.png"
        />

        {/* Kill Excel Section - Centered */}
        <div className="w-full max-w-4xl mt-48 text-center px-4">
          <div className="space-y-12">
            <div className="space-y-6">
              <span className="text-ruby font-black uppercase tracking-[0.4em] text-[10px] block mb-[10px]">Adeus às Planilhas</span>
              <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">
                Gestão Centralizada <br />
                <span className="text-white/40">Sem Caos Operacional.</span>
              </h2>
            </div>

            <p className="text-zinc-400 text-xl leading-relaxed font-medium max-w-2xl mx-auto">
              O Spotlight elimina a fragmentação da sua produção. Substituímos dezenas de abas do Excel por uma interface de alta performance, 
              onde cada centavo e cada membro do staff são rastreados em tempo real.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
              {[
                { title: "Staff Intelligence", desc: "Controle diárias de freelancers e equipe fixa com logs de auditoria." },
                { title: "Revenue Control", desc: "Acompanhe lucro líquido e despesas operacionais por espetáculo." },
                { title: "Real-time Check-in", desc: "Validação ultra-rápido de convidados e controle de acesso técnico." },
                { title: "Smart Reporting", desc: "Métricas de performance e ROI automatizadas ao fim de cada evento." }
              ].map((item, idx) => (
                <div key={idx} className="space-y-3 bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-ruby/30 transition-all group">
                  <h4 className="text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3">
                    <div className="w-2 h-2 bg-ruby rounded-full shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.5)]" />
                    {item.title}
                  </h4>
                  <p className="text-zinc-500 text-[11px] leading-relaxed uppercase font-black tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
