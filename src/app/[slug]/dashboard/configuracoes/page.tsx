"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Save, UserPlus, Shield, Moon, Trash2, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserPassConfirm, setNewUserPassConfirm] = useState("");
  const [isSudo, setIsSudo] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    loadProfile();
    if (localStorage.getItem('spotme_dark_mode') === 'true') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setCurrentUserId(user.id);

      const { data: role } = await supabase.from('user_roles').select('username, is_sudo, theater_id').eq('user_id', user.id).single();
      if (role) {
        setUsername(role.username || user.email || "");
        setIsSudo(role.is_sudo || false);

        // Carregar todos os users do teatro
        setLoadingUsers(true);
        const { data: allRoles } = await supabase.from('user_roles').select('id, user_id, username, role, is_sudo').eq('theater_id', role.theater_id).is('deleted_at', null);
        setUsers(allRoles || []);
        setLoadingUsers(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from('user_roles').update({ username }).eq('user_id', user.id);
      if (error) throw error;
      alert("Nome de usuário atualizado com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const toggleDarkMode = () => {
    const html = document.documentElement;
    const newIsDark = html.getAttribute('data-theme') !== 'dark';
    html.setAttribute('data-theme', newIsDark ? 'dark' : 'light');
    localStorage.setItem('spotme_dark_mode', String(newIsDark));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('spotme_dark_mode');
    router.push("/");
  };

  const handleAddUser = async () => {
    if (users.length >= 4) return alert("Limite máximo de 4 usuários atingido (incluindo Sudo).");
    if (newUserPass !== newUserPassConfirm) return alert("As senhas não coincidem.");
    if (!newUserEmail || !newUserPass) return alert("Preencha e-mail e senha.");
    if (newUserPass.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");

    try {
      // Criar usuário no Auth do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: newUserEmail, password: newUserPass });
      if (authError) throw authError;

      // Associar ao teatro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão perdida");
      const { data: role } = await supabase.from('user_roles').select('theater_id').eq('user_id', user.id).single();
      if (!role) throw new Error("Teatro não encontrado");

      await supabase.from('user_roles').insert({
        user_id: authData.user?.id,
        theater_id: role.theater_id,
        role: 'manager',
        username: newUserEmail,
        is_sudo: false
      });

      setNewUserEmail(""); setNewUserPass(""); setNewUserPassConfirm("");
      alert("Usuário adicionado com sucesso!");
      loadProfile(); // Recarregar lista
    } catch (err: any) { alert(err.message || "Erro ao adicionar usuário."); }
  };

  const handleRemoveUser = async (roleId: string, userId: string) => {
    if (!isSudo) return alert("Apenas o Dono (Sudo) pode excluir usuários.");
    if (userId === currentUserId) return alert("Você não pode excluir a si mesmo.");
    if (!confirm("Tem certeza que deseja remover este acesso?")) return;

    try {
      await supabase.from('user_roles').update({ deleted_at: new Date().toISOString() }).eq('id', roleId);
      setUsers(users.filter(u => u.id !== roleId));
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-3xl font-bold tracking-tight text-zinc-900">Configurações</h1><p className="text-zinc-500 mt-1">Gerencie seu perfil, temas e acessos do teatro.</p></div>
        </div>

        {/* Meu Perfil */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 border-b border-zinc-100 pb-2 flex items-center justify-between">
            <span>Meu Perfil</span>
            {isSudo && <span className="bg-ruby/10 text-ruby text-xs px-2 py-1 rounded flex items-center gap-1 font-bold"><Crown className="w-3 h-3" />SUDO</span>}
          </h2>
          <div className="space-y-4 max-w-md">
            <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Nome de Usuário</label><Input value={username} onChange={e => setUsername(e.target.value)} className="bg-zinc-50" /></div>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{saving ? "Salvando..." : "Atualizar Perfil"}
            </Button>
          </div>
        </div>

        {/* Modo Noturno */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><Moon className="w-5 h-5 text-zinc-400" />Modo Noturno</h2><p className="text-sm text-zinc-500 mt-1">Alterne o tema visual do painel.</p></div>
          <Button onClick={toggleDarkMode} className="px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer flex items-center gap-2"><Moon className="w-4 h-4" />Alternar Tema</Button>
        </div>

        {/* Equipe do Painel */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-2">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-zinc-400" />Equipe do Painel</h2>
            <span className="text-xs font-semibold bg-zinc-100 px-2 py-1 rounded text-zinc-600">{users.length}/4 Vagas</span>
          </div>
          {isSudo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Novo E-mail</label><Input type="email" placeholder="email@teatro.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="bg-zinc-50" disabled={users.length >= 4} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Senha</label><Input type="password" placeholder="******" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="bg-zinc-50" disabled={users.length >= 4} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 pb-1.5 block">Repetir Senha</label><Input type="password" placeholder="******" value={newUserPassConfirm} onChange={e => setNewUserPassConfirm(e.target.value)} className="bg-zinc-50" disabled={users.length >= 4} /></div>
              </div>
              <Button onClick={handleAddUser} disabled={users.length >= 4} className="bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer mb-6">Adicionar Acesso</Button>
            </>
          )}
          {loadingUsers ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div> : users.length > 0 && (
            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <label className="text-xs font-bold text-zinc-400 mb-2 block">Contas cadastradas</label>
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-md">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-900">{user.username}</span>
                    <span className="text-xs text-zinc-500">{user.is_sudo ? 'Sudo' : user.role}</span>
                  </div>
                  {isSudo && !user.is_sudo && (
                    <Button variant="ghost" onClick={() => handleRemoveUser(user.id, user.user_id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sair */}
        <div className="bg-red-50 rounded-xl border border-red-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800 mb-4 border-b border-red-200/50 pb-2 flex items-center gap-2"><Shield className="w-5 h-5" />Controle de Sessão</h2>
          <p className="text-sm text-red-600/80 mb-4">Ao sair, você precisará fazer login novamente.</p>
          <Button onClick={handleLogout} variant="destructive" className="flex items-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"><LogOut className="w-4 h-4" />Sair da Conta</Button>
        </div>
      </div>
    </div>
  );
}
