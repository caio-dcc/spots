"use client";

import { useState } from "react";
import { BlurText } from "@/components/ui/BlurText";
import { Footer } from "@/components/Footer";
import { Send, User, Building, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function EnterpriseSolutionsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const text = `*Nova Solicitação Enterprise*\n\n*Nome:* ${formData.name}\n*E-mail:* ${formData.email}\n*Empresa:* ${formData.company}\n*Mensagem:* ${formData.message}`;
    const encodedText = encodeURIComponent(text);
    
    // Salvar no banco de dados
    try {
      await supabase.from('access_requests').insert({
        full_name: formData.name,
        email: formData.email,
        message: `Empresa: ${formData.company} | ${formData.message}`,
        status: 'enterprise'
      });
    } catch (error) {
      console.error("Erro ao salvar solicitação:", error);
    }

    window.open(`https://wa.me/5521974026883?text=${encodedText}`, '_blank');
    window.location.href = `mailto:dev.caio.marques@gmail.com?subject=Solicitação Enterprise Spotlight&body=${encodedText}`;
  };

  return (
    <div className="flex-1 w-full flex flex-col relative bg-black min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/evento.png"
          alt="Background"
          fill
          className="object-cover opacity-30 blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/80" />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto px-8 py-32 relative z-10">
        <div className="text-center space-y-6 mb-16">
          <BlurText
            text="Soluções Enterprise"
            className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-tight"
            delay={50}
            animateBy="words"
            direction="bottom"
          />
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Leve a gestão da sua casa de espetáculos ou produtora para o próximo nível com suporte dedicado e recursos exclusivos.
          </p>
        </div>

        <form 
          onSubmit={handleSubmit}
          className="bg-transparent backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 space-y-8 shadow-2xl shadow-black/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Nome Completo</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pl-12 text-white outline-none focus:border-ruby/50 transition-all"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">E-mail Corporativo</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pl-12 text-white outline-none focus:border-ruby/50 transition-all"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Empresa / Produtora</label>
            <div className="relative">
              <input
                required
                type="text"
                placeholder="Nome da sua organização"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 pl-12 text-white outline-none focus:border-ruby/50 transition-all"
              />
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Como podemos ajudar?</label>
            <div className="relative">
              <textarea
                required
                rows={4}
                placeholder="Descreva brevemente suas necessidades..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pl-12 text-white outline-none focus:border-ruby/50 transition-all resize-none"
              />
              <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-white/20" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-5 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer shadow-xl"
          >
            <Send className="w-4 h-4" />
            Solicitar Contato
          </button>
        </form>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
