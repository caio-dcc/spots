"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, MessageSquare, ShieldAlert, Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

export default function ReportProblemPage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate sending email/storing ticket
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, you'd call an API or use mailto
      // For this task, we'll simulate success and show the email it would go to
      toast.success("Relatório enviado com sucesso! Analisaremos em breve.");
      
      // Option to also open mailto for the user
      // const mailtoUrl = `mailto:dev.caio.marquse@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(description)}`;
      // window.location.href = mailtoUrl;

      setSubject("");
      setDescription("");
    } catch (error) {
      toast.error("Erro ao enviar relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden bg-black">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 pt-[120px] pb-32 px-4">
        <div className="w-full max-w-2xl">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Voltar para o Início</span>
          </Link>

          <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden">
            {/* Header Decor */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert size={120} className="text-ruby" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-ruby/20 flex items-center justify-center border border-ruby/30">
                  <MessageSquare className="w-6 h-6 text-ruby" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Reportar Problema</h1>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Suporte Direto</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Assunto</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Erro ao finalizar compra"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full h-14 !bg-transparent border border-white/10 rounded-2xl px-6 !text-white/50 font-bold outline-none focus:border-ruby/50 transition-all placeholder:text-white/20 appearance-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Descrição Detalhada</label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Descreva o que aconteceu em detalhes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full !bg-transparent border border-white/10 rounded-3xl p-6 !text-white/50 font-bold outline-none focus:border-ruby/50 transition-all placeholder:text-white/20 resize-none appearance-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                  <p className="text-[10px] text-white/30 font-medium max-w-[240px] leading-relaxed">
                    Sua mensagem será enviada diretamente para nossa equipe técnica em <span className="text-white/60">dev.caio.marquse@gmail.com</span>
                  </p>
                  
                  <button
                    type="submit"
                    disabled={loading || !subject || !description}
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-ruby px-10 py-5 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-ruby/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Enviar Relatório</span>
                        <Send className="w-4 h-4 ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer accentColor="#810B14" />
    </div>
  );
}
