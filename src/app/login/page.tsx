"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SplitAuthComponent from "@/components/ui/SplitAuthComponent";
import { Footer } from "@/components/Footer";
import { getUserType } from "@/lib/auth-helpers";
import { toast } from "sonner";

export default function CustomerLoginPage() {
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
      if (userType === "admin") {
        await supabase.auth.signOut();
        throw new Error("Admins devem usar o login do painel. Acesse /house/login");
      }

      router.push("/mosaico-eventos");
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, name: string, phone?: string) => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name,
            phone_number: phone || null,
            user_type: "customer",
          }
        }
      });

      if (error) throw error;
      if (!user) throw new Error("Erro ao criar conta");

      // Try manual update just in case, but ignore RLS errors since trigger handles it
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            full_name: name,
            phone_number: phone || null,
            user_type: "customer",
          });
      } catch (e) {
        console.log("Profile created via trigger or RLS restricted manual update");
      }

      toast.success("Conta criada com sucesso! Você pode fazer login agora.");
      // Auto-fill login with registered email
      // No redirect - let user see the login form is ready
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      <main className="flex-1 w-full flex flex-col items-center relative z-10 pt-[80px] pb-32">
        <SplitAuthComponent
            accentColor="#810B14"
            accentRGB="129, 11, 20"
            onLoginSubmit={handleLogin}
            onRegisterSubmit={handleRegister}
            loading={loading}
            image="/bailarina.png"
        />
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
