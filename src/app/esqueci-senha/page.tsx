"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface InputProps {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: any;
}

const AppInput = ({ placeholder, type = "text", ...rest }: InputProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative w-full">
      <input
        className="peer relative z-10 h-14 w-full rounded-2xl border border-white/20 bg-zinc-900 px-6 font-bold text-white outline-none backdrop-blur-sm transition-all duration-200 ease-in-out focus:border-white/60 focus:bg-zinc-800 placeholder:font-medium placeholder:text-white/70 [color-scheme:dark]"
        placeholder={placeholder}
        type={type}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        {...rest}
      />
      {isHovering && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-md pointer-events-none z-20"
          style={{
            background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, #810B14 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/resetar-senha`,
      });

      if (err) throw err;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar reset de senha");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />
        <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
          <div className="w-full max-w-md px-6">
            <div className="bg-zinc-950/50 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-ruby/20 rounded-full p-4">
                  <Mail className="w-8 h-8 text-ruby" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Email Enviado</h1>
              <p className="text-white/70 text-sm mb-6">Verificamos seu email em nosso sistema. Se a conta existe, você receberá um link para resetar sua senha em breve.</p>
              <p className="text-white/50 text-xs mb-8">O link expira em 24 horas. Verifique sua pasta de spam se não receber.</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-ruby text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-ruby/90 transition-all">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />
      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-zinc-950/50 backdrop-blur-xl rounded-3xl border border-white/10 p-8 sm:p-12">
            <Link href="/login" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Esqueci minha Senha</h1>
              <p className="text-white/50 text-sm">Digite seu email para receber um link de recuperação</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2 ml-1">Email</label>
                <AppInput placeholder="seu@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-xs font-bold">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading || !email} className="group relative w-full inline-flex justify-center items-center overflow-hidden rounded-2xl bg-ruby px-8 py-4 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-ruby/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Enviar Link</span>}
              </button>
              <p className="text-center text-xs text-white/40">
                Lembrou sua senha? <Link href="/login" className="text-ruby hover:text-ruby/80 font-bold">Fazer Login</Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
