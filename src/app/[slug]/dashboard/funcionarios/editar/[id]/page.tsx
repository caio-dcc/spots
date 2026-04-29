"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { maskCPF, maskPhone, validateEmployee, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";
import Link from "next/link";

export default function EditarFuncionarioPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const router = useRouter();
  const params = useParams();
  const { slug, id } = params;
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [pix, setPix] = useState("");
  const [diaria, setDiaria] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isContracted, setIsContracted] = useState(false);
  const [isFreelancer, setIsFreelancer] = useState(true);
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState("ativo");

  const fetchFuncionario = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setNome(data.nome || "");
        setCpf(data.cpf || "");
        setTelefone(data.telefone || "");
        setEndereco(data.endereco || "");
        setCargo(data.cargo || "");
        setDepartamento(data.departamento || "");
        setPix(data.pix || "");
        setDiaria(String(data.diaria || "0").replace('.', ','));
        setObservacoes(data.observacoes || "");
        setIsContracted(data.is_contracted || false);
        setIsFreelancer(!data.is_contracted);
        setSalary(String(data.salary || "0").replace('.', ','));
        setStatus(data.status || "ativo");
      }
    } catch (error) {
      console.error("Erro ao buscar funcionário:", error);
      toast.error("Não foi possível carregar os dados do funcionário.");
      router.push(`/${slug}/dashboard/funcionarios/listar`);
    } finally {
      setLoading(false);
    }
  }, [id, slug, router]);

  useEffect(() => {
    fetchFuncionario();
  }, [fetchFuncionario]);

  const handleSave = async () => {
    const validationErrors = validateEmployee({ nome, cpf, telefone, cargo, departamento });
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Por favor, corrija os erros no formulário.");
      return;
    }

    setErrors([]);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('theater_id')
        .eq('user_id', user.id)
        .single();

      const { error: updateError } = await supabase
        .from('employees')
        .update({
          nome,
          cpf,
          telefone,
          endereco: endereco || null,
          cargo,
          departamento,
          pix: pix || null,
          diaria: isFreelancer ? (parseFloat(diaria.replace(',', '.')) || 0) : 0,
          salary: isContracted ? (parseFloat(salary.replace(',', '.')) || 0) : 0,
          is_contracted: isContracted,
          eh_fixo: isContracted,
          observacoes: observacoes || null,
          status
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (roleData?.theater_id) {
        await logAction(roleData.theater_id, 'EDITOU FUNCIONÁRIO', 'employees', nome);
      }

      toast.success("Funcionário atualizado com sucesso!");
      router.push(`/${slug}/dashboard/funcionarios/listar`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao atualizar funcionário.");
    } finally {
      setSaving(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-10 h-10 animate-spin text-ruby" />
      </div>
    );
  }

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href={`/${slug}/dashboard/funcionarios/listar`}
            className="flex items-center gap-2 text-zinc-500 hover:text-ruby transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a Lista
          </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-end md:justify-between text-center md:text-left mb-12 gap-6 md:gap-0">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Editar Funcionário</h1>
            <p className="text-zinc-500 mt-1 font-medium">Atualize os dados de {nome}.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-2xl h-14 px-10 shadow-2xl shadow-ruby/30 transition-all active:scale-95 font-bold text-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "" : "Salvar Alterações"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-32">
          <div className="xl:col-span-8 space-y-8">
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-ruby/10 flex items-center justify-center text-ruby">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Dados Pessoais e Profissionais</h2>
              </div>
          
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Nome Completo *</label>
                <Input 
                  placeholder="Ex: Carlos Eduardo Silva" 
                  className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('nome') ? "border-red-500" : ""}`}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                {getError('nome') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('nome')}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">CPF</label>
                  <Input 
                    placeholder="000.000.000-00" 
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('cpf') ? "border-red-500" : ""}`}
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                  />
                  {getError('cpf') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('cpf')}</p>}
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Telefone</label>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('telefone') ? "border-red-500" : ""}`}
                    value={telefone}
                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                  />
                  {getError('telefone') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('telefone')}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Endereço Completo</label>
                <Input 
                  placeholder="Rua, Número, Bairro, Cidade - UF" 
                  className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Cargo *</label>
                  <Input 
                    placeholder="Ex: Técnico de Som" 
                    className={`bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby ${getError('cargo') ? "border-red-500" : ""}`}
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                  />
                  {getError('cargo') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('cargo')}</p>}
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Departamento *</label>
                  <select 
                    className={`flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm ${getError('departamento') ? "border-red-500" : ""}`}
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
                  {getError('departamento') && <p className="text-xs text-red-500 mt-1 ml-1">{getError('departamento')}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Chave PIX</label>
                  <Input 
                    placeholder="E-mail, CPF, Telefone ou Aleatória" 
                    className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-medium text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                    value={pix}
                    onChange={(e) => setPix(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Status do Funcionário</label>
                  <select 
                    className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="ferias">Férias</option>
                  </select>
                </div>
              </div>

              {isFreelancer && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Valor da Diária (R$)</label>
                  <Input 
                    placeholder="0,00" 
                    className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                    value={diaria}
                    onChange={(e) => setDiaria(e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
            <div className="flex flex-col gap-6">
               <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block">Tipo de Contrato</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div 
                   onClick={() => { setIsContracted(true); setIsFreelancer(false); }}
                   className={`flex items-center gap-4 p-6 rounded-[1.5rem] border transition-all cursor-pointer shadow-sm ${isContracted ? 'bg-ruby/5 border-ruby/30 ring-2 ring-ruby/10' : 'bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/5 hover:border-ruby/20'}`}
                 >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isContracted ? 'border-ruby bg-ruby' : 'border-zinc-300'}`}>
                      {isContracted && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Funcionário Efetivado</p>
                      <p className="text-[10px] font-black text-ruby uppercase tracking-widest">CLT / Mensalista</p>
                    </div>
                 </div>

                 <div 
                   onClick={() => { setIsFreelancer(true); setIsContracted(false); }}
                   className={`flex items-center gap-4 p-6 rounded-[1.5rem] border transition-all cursor-pointer shadow-sm ${isFreelancer ? 'bg-ruby/5 border-ruby/30 ring-2 ring-ruby/10' : 'bg-zinc-50 dark:bg-white/5 border-zinc-100 dark:border-white/5 hover:border-ruby/20'}`}
                 >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isFreelancer ? 'border-ruby bg-ruby' : 'border-zinc-300'}`}>
                      {isFreelancer && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">Freelancer</p>
                      <p className="text-[10px] font-black text-ruby uppercase tracking-widest">Diária / Cachê</p>
                    </div>
                 </div>
               </div>
            </div>

            {isContracted && (
              <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-white/5 animate-in slide-in-from-top-4 duration-500">
                <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Salário Mensal (R$)</label>
                <Input 
                  placeholder="0,00" 
                  className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby shadow-sm"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Observações Internas</h2>
            <textarea 
              placeholder="Detalhes sobre o colaborador, disponibilidade, habilidades extras..." 
              className="w-full flex min-h-[160px] rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ruby transition-all shadow-sm resize-none"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
