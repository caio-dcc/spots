"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Theater, Calendar, Users, Ticket, BarChart3, Shield, ClipboardList, Mail } from "lucide-react";
import Grainient from "@/components/ui/grainient";
import Image from "next/image";
import Link from "next/link";
import { TextPressure } from "@/components/TextPressure";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    desc: "Calendário visual com todos os seus eventos. Busque, filtre e planeje sua temporada."
  },
  {
    icon: Users,
    title: "Gestão de Equipe",
    desc: "Cadastre funcionários, controle diárias, escalas e pagamentos por evento."
  },
  {
    icon: ClipboardList,
    title: "Listas VIP",
    desc: "Gere, importe e exporte listas de convidados. Compartilhe via WhatsApp em um clique."
  },
  {
    icon: Ticket,
    title: "Bilheteria & Benefícios",
    desc: "Controle ingressos, preços e convênios como APPAI direto no cadastro do evento."
  },
  {
    icon: BarChart3,
    title: "Relatórios & KPIs",
    desc: "Dashboards com fluxo de caixa, ocupação e relatórios de auditoria em tempo real."
  },
  {
    icon: Shield,
    title: "Multi-Tenant Seguro",
    desc: "Cada teatro isolado com RLS. Controle de acessos com até 3 operadores por painel."
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Animação de entrada dos feature cards
    const timer = setTimeout(() => setShowFeatures(true), 300);
    return () => clearTimeout(timer);
  }, []);

    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* Left Column - Showcase */}
      <div className="relative hidden md:flex flex-1 flex-col bg-black overflow-hidden">
        <Image
          src="/teatro_ilha.png"
          alt="Teatro da Ilha do Governador"
          fill
          unoptimized
          priority
          className="object-cover opacity-60 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/90" />
        
        <div className="relative z-10 flex-1 flex flex-col justify-between py-10 px-8">
          {/* Hero */}
          <div className="text-center">
            <div className="bg-black/40 backdrop-blur-xl py-8 px-6 rounded-2xl border border-white/5 max-w-xl mx-auto">
              <TextPressure 
                text="SpotMe" 
                className="text-5xl md:text-6xl font-bold tracking-wider text-white drop-shadow-lg" 
              />
              <p className="mt-4 text-lg text-white/80 max-w-md mx-auto leading-relaxed">
                A plataforma completa de gestão para teatros. Controle eventos, equipe, 
                bilheteria e convidados VIP em um só lugar.
              </p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 mt-8 max-w-3xl mx-auto w-full">
            {features.map((feat, i) => (
              <div 
                key={feat.title}
                className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 
                  hover:bg-white/10 hover:border-white/20 transition-all duration-500 cursor-default
                  ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <feat.icon className="w-5 h-5 text-ruby mb-2" />
                <h3 className="text-sm font-semibold text-white mb-1">{feat.title}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-2 text-white/50 mt-8">
            <p className="text-sm font-medium">Desenvolvido por Caio Marques</p>
            <div className="flex items-center gap-4">
              <a 
                href="https://www.linkedin.com/in/caio-marques-682446234/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="LinkedIn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a 
                href="https://wa.me/5521974026883" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </a>
              <a 
                href="mailto:dev.caio.marques@gmail.com" 
                className="hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                title="E-mail"
              >
                <Mail className="w-[18px] h-[18px]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="relative flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Grainient
            color1="#5C0A12"
            color2="#2A0005"
            color3="#9B111E"
          />
        </div>
        <Card className="relative z-10 w-full max-w-md bg-white border-0 ring-0 shadow-2xl rounded-3xl overflow-hidden transform-gpu mask-border">
          <form onSubmit={handleLogin}>
            <CardHeader className="space-y-2 text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-2 md:hidden">
                <Theater className="h-10 w-10 text-ruby" />
              </div>
              <CardTitle className="text-3xl font-bold">Acessar Sistema</CardTitle>
              <CardDescription className="text-zinc-600 mb-[10px]">
                Insira suas credenciais para gerenciar os eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@spotme.com"
                  required
                  className="bg-zinc-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="bg-zinc-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-2">
                <Link
                  href="/esqueci-senha"
                  className="text-sm font-medium text-ruby hover:underline transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </CardContent>
            <CardFooter className="bg-transparent border-0">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-ruby hover:bg-ruby/90 cursor-pointer text-white font-medium text-lg h-12 transition-colors"
              >
                {loading ? "Carregando..." : "Entrar"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Mobile Footer */}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex flex-col items-center justify-center gap-1 text-white/60 md:hidden">
          <p className="text-xs font-medium">Desenvolvido por Caio Marques</p>
          <div className="flex items-center gap-3">
            <a href="https://www.linkedin.com/in/caio-marques-682446234/" target="_blank" rel="noopener noreferrer" className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://wa.me/5521974026883" target="_blank" rel="noopener noreferrer" className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </a>
            <a href="mailto:dev.caio.marques@gmail.com" className="p-1">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
