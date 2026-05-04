"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Falha ao autenticar");
        return;
      }
      router.replace("/admin/view");
      router.refresh();
    } catch {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-ruby/10 border border-ruby/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-ruby" />
          </div>
          <h1 className="text-[11px] uppercase tracking-[0.3em] font-black text-zinc-400">
            Spotlight · Painel Master
          </h1>
          <p className="text-xs text-zinc-500 text-center">
            Acesso restrito. Todas as tentativas são auditadas.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur"
        >
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-ruby focus:outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </label>

          <label className="block mt-4">
            <span className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
              Senha
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-ruby focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mt-4 px-3 py-2 rounded-lg bg-red-950/60 border border-red-900 text-red-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-ruby text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-ruby/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-ruby/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {loading ? "Validando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center mt-6 text-[10px] uppercase tracking-widest font-black text-zinc-600">
          v0.0.5 · master console
        </p>
      </div>
    </div>
  );
}
