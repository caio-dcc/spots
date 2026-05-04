"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
        className="peer relative z-10 h-14 w-full rounded-2xl border border-white/20 bg-black/40 px-6 font-bold text-white outline-none backdrop-blur-sm transition-all duration-200 ease-in-out focus:border-white/60 focus:bg-white/15 placeholder:font-medium placeholder:text-white/70"
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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const type = params.get("type");

    if (!accessToken || type !== "recovery") {
      setInvalidToken(true);
    }
  }, []);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Senha deve ter no mínimo 8 caracteres";
    if (!/[A-Z]/.test(pwd)) return "Deve conter pelo menos uma letra maiúscula";
    if (!/[a-z]/.test(pwd)) return "Deve conter pelo menos uma letra minúscula";
    if (!/[0-9]/.test(pwd)) return "Deve conter pelo menos um número";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password);
    if (validation) {
      setError(validation);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      const { error: err } = await supabase.auth.updateUser({ password });

      if (err) throw err;

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao resetar senha");
    } finally {
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />
        <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
          <div className="w-full max-w-md px-6">
            <div className="bg-zinc-950/50 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-red-500/20 rounded-full p-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Link Inválido</h1>
              <p className="text-white/70 text-sm mb-8">Este link de reset é inválido ou expirou. Solicite um novo link de recuperação.</p>
              <Link href="/esqueci-senha" className="inline-flex items-center gap-2 px-6 py-3 bg-ruby text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-ruby/90 transition-all">
                Solicitar Novo Link
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/10 blur-[120px] rounded-full" />
        <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
          <div className="w-full max-w-md px-6">
            <div className="bg-zinc-950/50 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="bg-green-500/20 rounded-full p-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Senha Resetada!</h1>
              <p className="text-white/70 text-sm mb-8">Sua senha foi alterada com sucesso. Você será redirecionado para login em breve.</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-ruby text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-ruby/90 transition-all">
                Ir para Login
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
            <Link href="/esqueci-senha" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Resetar Senha</h1>
              <p className="text-white/50 text-sm">Digite sua nova senha com segurança</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2 ml-1">Nova Senha</label>
                <AppInput
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-white/40 mt-2">Deve conter: maiúscula, minúscula, número, 8+ caracteres</p>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-white/60 mb-2 ml-1">Confirmar Senha</label>
                <AppInput
                  placeholder="Confirme sua nova senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-xs font-bold">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading || !password || !confirmPassword} className="group relative w-full inline-flex justify-center items-center overflow-hidden rounded-2xl bg-ruby px-8 py-4 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-ruby/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Confirmar Senha</span>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950"><Loader2 className="w-10 h-10 animate-spin text-ruby" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
