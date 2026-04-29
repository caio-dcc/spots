"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Ticket, BarChart3, Shield, ClipboardList, Mail, Mic, Music, Loader2 } from "lucide-react";
import Grainient from "@/components/ui/grainient";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import CircularText from "@/components/CircularText";

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
    desc: "Automação de fluxo de caixa a partir da contagem dos ingressos e relatórios de auditoria em tempo real."
  },
  {
    icon: Shield,
    title: "Segurança de Dados",
    desc: "Proteção total LGPD com segurança avançada do Supabase e isolamento de dados por perfil."
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setShowFeatures(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
    <div className="min-h-screen w-full flex flex-col bg-black overflow-x-hidden">
      {/* Showcase Section */}
      <div className="relative w-full flex flex-col items-center py-20 px-4 overflow-hidden">
        <Image
          src="/teatro_ilha.png"
          alt="Teatro da Ilha do Governador"
          fill
          unoptimized
          priority
          className="object-cover opacity-30 blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />

        <div className="relative z-10 w-full max-w-7xl flex flex-col items-center justify-center pt-20 px-6 gap-16">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-[250px] w-full">
            {/* Left Side: Circular Branding */}
            <div className="flex items-center justify-center relative min-h-[400px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <CircularText
                  text="praticidade gera paz • "
                  spinDuration={20}
                  onHover="slowDown"
                  className="opacity-40 scale-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-10 text-white/20 z-10 animate-in fade-in zoom-in duration-1000">
                <Mic className="w-16 h-16" />
                <Music className="w-16 h-16" />
                <Users className="w-16 h-16" />
                <Ticket className="w-16 h-16" />
              </div>
            </div>

            {/* Right Side: Problems/Solutions Card */}
            <div className="w-full max-w-[540px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[3rem] p-10 flex flex-col gap-6 overflow-hidden border-none outline-none">
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-6 mb-4">
                  <img src="/icon.png" alt="Spotlight Logo" className="w-24 h-24 object-contain" />
                  <span className="font-bold tracking-[0.2em] text-zinc-900 text-3xl uppercase">Spotlight</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
                    Gestão de Eventos e Estabelecimentos
                  </h2>
                  <p className="text-zinc-400 text-sm font-medium tracking-wider">
                    Controle e registro unidos
                  </p>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Elimine planilhas, erros manuais na sua casa de eventos com o Spotlight.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { q: "Caos nas Listas?", a: "Check-in real-time. Com montagem de lista customizada e preparada para formatação" },
                  { q: "Equipe?", a: "Escalas, diárias e pagamentos. Registro e controle total do seu time." },
                  { q: "Bilheteria?", a: "Contagem de ingressos, fluxo de caixa e integrações para facilitar seu dia a dia" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-2 w-2 h-2 rounded-full bg-ruby shrink-0" />
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{item.q}</h4>
                      <p className="text-zinc-500 text-xs">{item.a}</p>
                    </div>
                  </div>

                ))}
              </div>

              <Button
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl h-14 text-base font-bold mt-4 shadow-xl shadow-zinc-200 cursor-pointer transition-all hover:scale-[1.02]"
              >
                Ver planos disponíveis
              </Button>
            </div>
          </div>
        </div>

        {/* Impact Message */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center py-[20px] px-6 gap-0">
          <p className="text-white text-lg md:text-2xl font-bold tracking-tight text-center max-w-4xl leading-relaxed p-[10px]">
            Organize e automatize planilhas, <span className="text-ruby">elimine a complexidade!</span>
          </p>
          <p className="text-white text-lg md:text-2xl font-bold tracking-tight text-center max-w-4xl leading-relaxed p-[10px]">
            Tenha controle de freelancers, <span className="text-ruby">tenha liberdade</span>
          </p>
        </div>

        {/* Feature Grid */}
        <div className="relative z-10 w-full max-w-6xl mt-4 mb-20 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {features.map((feat, i) => (
              <div
                key={feat.title}
                className={`bg-white/5 backdrop-blur-sm border-0 rounded-2xl p-6 min-h-[160px] min-w-[200px]
                  hover:bg-white/10 transition-all duration-500 cursor-default
                  ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <feat.icon className="w-8 h-8 text-ruby mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="relative z-10 w-full max-w-6xl px-6 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Plan 1 */}
            <Card className="bg-white/5 backdrop-blur-sm border-0 text-white rounded-3xl p-8 hover:bg-white/10 transition-all">
              <h3 className="text-xl font-bold mb-2">Essencial</h3>
              <div className="text-4xl font-black mb-6">R$ 100<span className="text-sm font-normal opacity-60">/mês</span></div>
              <ul className="space-y-4 mb-8 text-sm opacity-80">
                <li className="flex items-center gap-2">✕ Fotos indisponíveis</li>
                <li className="flex items-center gap-2">✕ Taxa de 5% sobre lucro</li>
                <li className="flex items-center gap-2">✓ Relatórios Básicos</li>
                <li className="flex items-center gap-2">✓ Automatização de planilhas</li>
                <li className="flex items-center gap-2">✓ Funcionários & Freelancers</li>
                <li className="flex items-center gap-2">✓ Controle de Eventos</li>
              </ul>
              <Button className="w-full bg-white text-black hover:bg-zinc-200 rounded-xl cursor-pointer">Assinar agora</Button>
            </Card>

            {/* Plan 2 */}
            <Card className="bg-ruby text-white border-0 rounded-3xl p-8 scale-105 shadow-[0_20px_40px_rgba(155,17,30,0.3)]">
              <h3 className="text-xl font-bold mb-2">Profissional</h3>
              <div className="text-4xl font-black mb-6">R$ 300<span className="text-sm font-normal opacity-80">/mês</span></div>
              <ul className="space-y-4 mb-8 text-sm">
                <li className="flex items-center gap-2">✓ Lucro totalmente individual</li>
                <li className="flex items-center gap-2">✓ Fotos Disponíveis</li>
                <li className="flex items-center gap-2">✓ Suporte E-mail Prioritário</li>
                <li className="flex items-center gap-2">✓ Pedidos Personalizados</li>
                <li className="flex items-center gap-2">✓ Funcionários & Freelancers</li>
                <li className="flex items-center gap-2">✓ Controle de Eventos</li>
              </ul>
              <Button className="w-full bg-white text-ruby hover:bg-zinc-100 rounded-xl cursor-pointer">Mais Popular</Button>
            </Card>

            {/* Plan 3 */}
            <Card className="bg-white/5 backdrop-blur-sm border-0 text-white rounded-3xl p-8 hover:bg-white/10 transition-all">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-black mb-6">R$ 500<span className="text-sm font-normal opacity-60">/mês</span></div>
              <ul className="space-y-4 mb-8 text-sm opacity-80">
                <li className="flex items-center gap-2">✓ Lucro totalmente individual</li>
                <li className="flex items-center gap-2">✓ Relatórios Avançados</li>
                <li className="flex items-center gap-2">✓ Log de Auditoria</li>
                <li className="flex items-center gap-2">✓ Suporte por Call</li>
                <li className="flex items-center gap-2">✓ Integração Ticketmaster</li>
                <li className="flex items-center gap-2">✓ Funcionários & Freelancers</li>
                <li className="flex items-center gap-2">✓ Controle de Eventos</li>
              </ul>
              <Button className="w-full border border-white/20 hover:bg-white/10 rounded-xl cursor-pointer">Contatar Vendas</Button>
            </Card>
          </div>

          {/* Especial Plan */}
          <Card className="bg-gradient-to-r from-zinc-900 to-black border-0 text-white rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Plano Especial</h3>
              <p className="opacity-60">Soluções personalizadas para grandes redes de entretenimento.</p>
            </div>
            <Button className="bg-ruby hover:bg-ruby/90 text-white px-10 h-14 rounded-2xl text-lg font-bold cursor-pointer transition-transform hover:scale-105">
              Solicitar Proposta
            </Button>
          </Card>
        </div>

        {/* Login Section */}
        <div id="login" className="relative z-10 w-full max-w-md mx-auto mb-32">
          <div className="bg-white/10 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.5)] rounded-[3rem] overflow-hidden border border-white/20 p-12 flex flex-col gap-8 transition-all hover:shadow-ruby/5">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <img 
                  src="/icon.png" 
                  alt="Spotlight" 
                  className="h-28 w-auto object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" 
                />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Portal Administrativo</h3>
                <p className="text-zinc-400 text-sm font-medium mt-2">
                  Acesse o painel de controle Spotlight
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300 font-bold ml-1">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@myspot.com"
                    required
                    className="bg-white/5 border-white/10 text-white h-14 rounded-2xl px-6 focus:ring-ruby backdrop-blur-md font-medium placeholder:text-white/50 transition-all focus:bg-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-300 font-bold ml-1">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-white/5 border-white/10 text-white h-14 rounded-2xl px-6 focus:ring-ruby backdrop-blur-md font-medium placeholder:text-white/50 transition-all focus:bg-white/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-ruby hover:bg-ruby/90 text-white rounded-2xl h-16 text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer mt-4 shadow-2xl shadow-ruby/40 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Entrar agora"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Global Footer */}
      <footer className="relative z-10 w-full py-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-white font-black tracking-widest text-xl">SPOTLIGHT</p>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">© 2026 Spotlight — Praticidade gera paz.</p>
          </div>
          
          <p className="text-sm font-bold tracking-tight text-white/60">
            Design & Tech by <span className="text-ruby">Caio Marques</span> — Grey Systems
          </p>
          
          <div className="flex items-center gap-8">
            <a href="https://www.linkedin.com/in/caio-marques-682446234/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
            </a>
            <a href="mailto:dev.caio.marques@gmail.com" className="text-zinc-500 hover:text-white transition-colors">
              <Mail className="w-6 h-6" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
