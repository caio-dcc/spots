"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function EsqueciSenhaPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) return alert("Preencha seu e-mail");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/esqueci-senha?step=3`,
      });
      if (error) throw error;
      alert("E-mail de recuperação enviado! Verifique sua caixa de entrada (e spam).");
      setStep(2);
    } catch (err: any) { alert(err.message || "Erro ao enviar e-mail."); } finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (newPass !== confirmPass) return alert("As senhas não coincidem.");
    if (newPass.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      alert("Senha alterada com sucesso! Você já pode fazer login.");
      window.location.href = "/";
    } catch (err: any) { alert(err.message || "Erro ao alterar senha."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 animate-in fade-in zoom-in-95 duration-500">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-ruby mb-6 transition-colors"><ArrowLeft className="w-4 h-4 mr-1" />Voltar para Login</Link>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-ruby/10 text-ruby rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-6 h-6" /></div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Esqueci minha senha</h1>
              <p className="text-sm text-zinc-500 mt-2">Digite o e-mail cadastrado para receber um link de recuperação.</p>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">E-mail</label><Input type="email" placeholder="seu@email.com" className="bg-zinc-50 h-12 text-base" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendCode()} /></div>
              <Button onClick={handleSendCode} disabled={loading} className="w-full bg-ruby hover:bg-ruby/90 text-white h-12 text-base font-semibold cursor-pointer">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}{loading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-ruby/10 text-ruby rounded-full flex items-center justify-center mx-auto mb-4"><KeyRound className="w-6 h-6" /></div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Verifique seu E-mail</h1>
              <p className="text-sm text-zinc-500 mt-2">Enviamos um link de recuperação para <strong>{email}</strong>. Clique no link para definir sua nova senha.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-600">
                <p className="font-semibold mb-1">Não recebeu?</p>
                <p>Verifique a pasta de spam ou clique abaixo para reenviar.</p>
              </div>
              <Button onClick={handleSendCode} disabled={loading} variant="outline" className="w-full h-12 text-base font-semibold cursor-pointer">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}Reenviar E-mail
              </Button>
              <button onClick={() => setStep(1)} className="w-full text-sm font-semibold text-zinc-500 hover:text-zinc-800 text-center cursor-pointer">Tentar outro e-mail</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-6 h-6" /></div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Nova Senha</h1>
              <p className="text-sm text-zinc-500 mt-2">Crie uma nova senha segura para acessar seu painel.</p>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Nova Senha</label><Input type="password" placeholder="Mínimo 6 caracteres" className="bg-zinc-50 h-12" value={newPass} onChange={e => setNewPass(e.target.value)} /></div>
              <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Repetir Nova Senha</label><Input type="password" placeholder="Repita a senha" className="bg-zinc-50 h-12" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResetPassword()} /></div>
              <Button onClick={handleResetPassword} disabled={loading} className="w-full bg-ruby hover:bg-ruby/90 text-white h-12 text-base font-semibold cursor-pointer mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}{loading ? "Salvando..." : "Salvar Nova Senha"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
