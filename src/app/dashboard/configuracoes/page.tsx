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
  const [theaters, setTheaters] = useState<any[]>([]);
  const [loadingTheaters, setLoadingTheaters] = useState(false);
  const [newTheaterName, setNewTheaterName] = useState("");

  useEffect(() => {
    loadProfile();
    // O tema já foi aplicado pelo script inline no <head> do layout.
    // Não precisamos resetar aqui para evitar override do estado salvo.
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setCurrentUserId(user.id);
      setUsername(user.user_metadata?.full_name || user.email || "Usuário");

      // Verificar se sou membro de alguém
      const { data: membership } = await supabase.from('team_members').select('owner_id').eq('member_id', user.id).single();
      
      if (membership) {
        setIsSudo(false);
        // Se sou membro, listar outros membros da mesma equipe
        const { data: team } = await supabase.from('team_members').select('id, member_id, role').eq('owner_id', membership.owner_id);
        // Buscar emails dos membros (simulado, já que user_roles foi removido, idealmente teríamos uma tabela profiles)
        setUsers(team?.map(t => ({ id: t.id, user_id: t.member_id, username: `Membro (${t.role})`, is_sudo: false })) || []);
      } else {
        setIsSudo(true); // Dono da própria conta
        // Carregar meus membros
        setLoadingUsers(true);
        const { data: myTeam } = await supabase.from('team_members').select('id, member_id, role').eq('owner_id', user.id);
        setUsers(myTeam?.map(t => ({ id: t.id, user_id: t.member_id, username: `Membro ID: ${t.member_id.substring(0,8)}...`, is_sudo: false })) || []);
        setLoadingUsers(false);

        // Carregar meus locais
        loadTheaters(user.id);
      }
    } catch (err) { console.error(err); }
  };

  const loadTheaters = async (userId: string) => {
    setLoadingTheaters(true);
    const { data } = await supabase.from('theaters').select('*').eq('user_id', userId).order('name');
    setTheaters(data || []);
    setLoadingTheaters(false);
  };

  const handleAddTheater = async () => {
    if (!newTheaterName.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('theaters').insert({ name: newTheaterName.trim(), user_id: user.id });
      if (error) throw error;
      setNewTheaterName("");
      loadTheaters(user.id);
    } catch (err: any) { alert(err.message); }
  };

  const handleRemoveTheater = async (id: string) => {
    if (!confirm("Remover este local? Eventos vinculados podem perder a referência.")) return;
    try {
      const { error } = await supabase.from('theaters').delete().eq('id', id);
      if (error) throw error;
      setTheaters(theaters.filter(t => t.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.auth.updateUser({
        data: { full_name: username }
      });
      if (error) throw error;
      alert("Perfil atualizado com sucesso!");
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const toggleDarkMode = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('spotme_dark_mode', String(newTheme === 'dark'));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('spotme_dark_mode');
    router.push("/");
  };

  const handleAddUser = async () => {
    if (users.length >= 10) return alert("Limite de equipe atingido.");
    if (newUserPass !== newUserPassConfirm) return alert("As senhas não coincidem.");
    if (!newUserEmail || !newUserPass) return alert("Preencha e-mail e senha.");

    try {
      // Nota: No Supabase Auth, signUp cria o usuário. 
      // Em uma app real, você enviaria um convite ou usaria uma edge function com service_role.
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: newUserEmail, 
        password: newUserPass,
        options: { data: { full_name: newUserEmail.split('@')[0] } }
      });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão perdida");

      const { error: teamErr } = await supabase.from('team_members').insert({
        owner_id: user.id,
        member_id: authData.user?.id,
        role: 'manager'
      });
      if (teamErr) throw teamErr;

      setNewUserEmail(""); setNewUserPass(""); setNewUserPassConfirm("");
      alert("Membro adicionado à equipe!");
      loadProfile();
    } catch (err: any) { alert(err.message || "Erro ao adicionar membro."); }
  };

  const handleRemoveUser = async (id: string) => {
    if (!isSudo) return alert("Apenas o dono pode gerenciar a equipe.");
    if (!confirm("Remover este membro da equipe?")) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', id);
      if (error) throw error;
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div><h1 className="text-3xl font-bold tracking-tight text-ruby">Configurações</h1><p className="text-zinc-500 mt-1">Gerencie seu perfil, temas e acessos do evento.</p></div>
        </div>

        {/* Meu Perfil */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center justify-between">
            <span>Meu Perfil</span>
            {isSudo && <span className="bg-ruby/10 text-ruby text-xs px-2 py-1 rounded flex items-center gap-1 font-bold"><Crown className="w-3 h-3" />SUDO</span>}
          </h2>
          <div className="space-y-4 max-w-md">
            <div><label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 pb-1.5 block">Nome de Usuário</label><Input value={username} onChange={e => setUsername(e.target.value)} className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" /></div>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}{saving ? "Salvando..." : "Atualizar Perfil"}
            </Button>
          </div>
        </div>

        {/* Meus Locais (Teatros) */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
            <Crown className="w-5 h-5 text-zinc-400" />
            Meus Locais (Theaters)
          </h2>
          <p className="text-sm text-zinc-500 mb-6">Cadastre as localidades (teatros, salas, arenas) onde seus eventos acontecem.</p>
          
          <div className="flex gap-4 mb-6">
            <Input 
              placeholder="Nome do Local (ex: Teatro Municipal)" 
              value={newTheaterName}
              onChange={e => setNewTheaterName(e.target.value)}
              className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white"
            />
            <Button onClick={handleAddTheater} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer whitespace-nowrap">
              <Crown className="w-4 h-4 mr-2" />
              Adicionar Local
            </Button>
          </div>

          <div className="space-y-2">
            {loadingTheaters ? <Loader2 className="w-6 h-6 animate-spin text-zinc-400 mx-auto" /> : theaters.length === 0 ? (
              <p className="text-center text-zinc-400 text-sm py-4 italic">Nenhum local cadastrado.</p>
            ) : theaters.map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.address || "Sem endereço cadastrado"}</p>
                </div>
                <Button variant="ghost" onClick={() => handleRemoveTheater(t.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        {/* Modo Noturno */}

        {/* Equipe */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-2">
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-zinc-400" />Equipe</h2>
            <span className="text-xs font-semibold bg-zinc-100 px-2 py-1 rounded text-zinc-600">{users.length}/4 Vagas</span>
          </div>
          {isSudo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <div><label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 pb-1.5 block">Novo E-mail</label><Input type="email" placeholder="email@evento.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" disabled={users.length >= 4} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 pb-1.5 block">Senha</label><Input type="password" placeholder="******" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" disabled={users.length >= 4} /></div>
                <div><label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 pb-1.5 block">Repetir Senha</label><Input type="password" placeholder="******" value={newUserPassConfirm} onChange={e => setNewUserPassConfirm(e.target.value)} className="bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" disabled={users.length >= 4} /></div>
              </div>
              <Button onClick={handleAddUser} disabled={users.length >= 4} className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100 cursor-pointer mb-6">Adicionar Acesso</Button>
            </>
          )}
          {loadingUsers ? <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div> : users.length > 0 && (
            <div className="space-y-2 border-t border-zinc-100 pt-4">
              <label className="text-xs font-bold text-zinc-400 mb-2 block">Contas cadastradas</label>
              {users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{user.username}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.is_sudo ? 'Sudo' : user.role}</span>
                  </div>
                  {isSudo && !user.is_sudo && (
                    <Button variant="ghost" onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
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
