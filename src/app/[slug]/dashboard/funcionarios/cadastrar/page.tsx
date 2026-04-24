"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { maskCPF, maskPhone, validateEmployee, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";

export default function CadastrarFuncionarioPage() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const router = useRouter();
  const params = useParams();
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [pix, setPix] = useState("");

  const handleSave = async () => {
    const validationErrors = validateEmployee({ nome, cpf, telefone, cargo, departamento });
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    setErrors([]);
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
          endereco: endereco || null,
          cargo,
          departamento,
          pix: pix || null,
          status: 'ativo'
        });

      if (insertError) throw insertError;

      await logAction(roleData.theater_id, 'CADASTROU FUNCIONÁRIO', 'employees', nome);

      toast.success("Funcionário cadastrado com sucesso!");
      router.push(`/${params.slug}/dashboard/funcionarios/listar`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao cadastrar funcionário.");
    } finally {
      setLoading(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full flex flex-col items-center animate-in fade-in duration-500 overflow-y-auto font-sansation">
      <div className="max-w-2xl w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ruby">Cadastrar Funcionário</h1>
            <p className="text-zinc-500 mt-1 text-xs">Registre um novo membro da equipe do teatro.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-full px-6 shadow-lg shadow-ruby/20 transition-all active:scale-95 font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Salvando..." : "Salvar Funcionário"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-zinc-400" />
            Dados Pessoais e Profissionais
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold not-italic text-zinc-700 pb-1.5 block">Nome Completo *</label>
              <Input 
                placeholder="Ex: Carlos Eduardo Silva" 
                className={`bg-zinc-50 ${getError('nome') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              {getError('nome') && <p className="text-xs text-red-500 mt-1">{getError('nome')}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-bold not-italic text-zinc-700 pb-1.5 block">CPF</label>
                <Input 
                  placeholder="000.000.000-00" 
                  className={`bg-zinc-50 ${getError('cpf') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                />
                {getError('cpf') && <p className="text-xs text-red-500 mt-1">{getError('cpf')}</p>}
              </div>
              <div>
                <label className="text-sm font-bold not-italic text-zinc-700 pb-1.5 block">Telefone</label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  className={`bg-zinc-50 ${getError('telefone') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
                  value={telefone}
                  onChange={(e) => setTelefone(maskPhone(e.target.value))}
                />
                {getError('telefone') && <p className="text-xs text-red-500 mt-1">{getError('telefone')}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Endereço Completo</label>
              <Input 
                placeholder="Rua, Número, Bairro, Cidade - UF" 
                className="bg-zinc-50 focus:ring-ruby" 
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Cargo *</label>
                <Input 
                  placeholder="Ex: Técnico de Som" 
                  className={`bg-zinc-50 ${getError('cargo') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
                {getError('cargo') && <p className="text-xs text-red-500 mt-1">{getError('cargo')}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Departamento *</label>
                <select 
                  className={`flex h-10 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${getError('departamento') ? "border-red-500 focus:ring-red-500" : "focus:ring-ruby"}`}
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
                {getError('departamento') && <p className="text-xs text-red-500 mt-1">{getError('departamento')}</p>}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold not-italic text-zinc-700 pb-1.5 block">Chave PIX (Para pagamento de diárias)</label>
              <Input 
                placeholder="E-mail, CPF, Telefone ou Aleatória" 
                className="bg-zinc-50 focus:ring-ruby" 
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
