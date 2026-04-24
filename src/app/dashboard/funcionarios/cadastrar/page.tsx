"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function CadastrarFuncionarioPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [pix, setPix] = useState("");

  const handleSave = async () => {
    if (!nome || !cargo || !departamento) {
      alert("Por favor, preencha os campos obrigatórios (Nome, Cargo e Departamento).");
      return;
    }

    setLoading(true);
    try {
      // 1. Pegar o theater_id do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', user.id)
        .single();

      if (roleError || !roleData) throw new Error("Não foi possível localizar seu teatro associado.");

      // 2. Inserir o funcionário
      const { error: insertError } = await supabase
        .from('employees')
        .insert({
          theater_id: roleData.theater_id,
          nome,
          cpf,
          telefone,
          endereco,
          cargo,
          departamento,
          pix,
          status: 'ativo'
        });

      if (insertError) throw insertError;

      alert("Funcionário cadastrado com sucesso!");
      router.push("/dashboard/funcionarios/listar");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert(error.message || "Erro ao cadastrar funcionário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 w-full h-full flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto">
      <div className="max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Cadastrar Funcionário</h1>
            <p className="text-zinc-500 mt-1">Registre um novo membro da equipe do teatro.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-400" />
            Dados Pessoais e Profissionais
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Nome Completo *</label>
              <Input 
                placeholder="Ex: Carlos Eduardo Silva" 
                className="bg-zinc-50" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">CPF</label>
                <Input 
                  placeholder="000.000.000-00" 
                  className="bg-zinc-50" 
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Telefone</label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  className="bg-zinc-50" 
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Endereço Completo</label>
              <Input 
                placeholder="Rua, Número, Bairro, Cidade - UF" 
                className="bg-zinc-50" 
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Cargo *</label>
                <Input 
                  placeholder="Ex: Técnico de Som" 
                  className="bg-zinc-50" 
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Departamento *</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby cursor-pointer"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  <option value="tecnica">Técnica</option>
                  <option value="producao">Produção</option>
                  <option value="bilheteria">Bilheteria / Recepção</option>
                  <option value="seguranca">Segurança</option>
                  <option value="limpeza">Limpeza / Manutenção</option>
                  <option value="administrativo">Administrativo</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Chave PIX (Para pagamento de diárias)</label>
              <Input 
                placeholder="E-mail, CPF, Telefone ou Aleatória" 
                className="bg-zinc-50" 
                value={pix}
                onChange={(e) => setPix(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
