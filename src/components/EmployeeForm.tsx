"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { maskCPF, maskPhone, validateEmployee, ValidationError } from "@/lib/masks";
import { logAction } from "@/lib/audit";

interface EmployeeFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function EmployeeForm({ initialData, isEdit }: EmployeeFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const router = useRouter();
  const params = useParams();
  
  // Estados do formulário
  const [nome, setNome] = useState(initialData?.nome || "");
  const [cpf, setCpf] = useState(initialData?.cpf || "");
  const [telefone, setTelefone] = useState(initialData?.telefone || "");
  const [endereco, setEndereco] = useState(initialData?.endereco || "");
  const [cargo, setCargo] = useState(initialData?.cargo || "");
  const [departamento, setDepartamento] = useState(initialData?.departamento || "");
  const [pix, setPix] = useState(initialData?.pix || "");
  const [diaria, setDiaria] = useState(initialData?.diaria?.toString() || "");
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || "");
  const [isContracted, setIsContracted] = useState(initialData?.is_contracted || false);
  const [isFreelancer, setIsFreelancer] = useState(!initialData?.is_contracted);
  const [salary, setSalary] = useState(initialData?.salary?.toString() || "");
  const [status, setStatus] = useState(initialData?.status || "ativo");
  const [theaterId, setTheaterId] = useState(initialData?.theater_id || "");
  const [theaters, setTheaters] = useState<any[]>([]);

  useEffect(() => {
    async function fetchTheaters() {
      const { data } = await supabase.from('theaters').select('id, name');
      if (data) setTheaters(data);
    }
    fetchTheaters();
  }, []);

  const handleSave = async () => {
    const validationErrors = validateEmployee({ nome, cpf, telefone, cargo, departamento });
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      validationErrors.forEach(err => toast.error(err.message));
      return;
    }

    setErrors([]);
    setLoading(true);
    try {
      const { getContextUserId } = await import("@/lib/auth-context");
      const userId = await getContextUserId();
      if (!userId) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: userId,
        theater_id: theaterId || null,
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
        status: status
      };

      if (isEdit) {
        const { error } = await supabase.from('employees').update(payload).eq('id', initialData.id);
        if (error) throw error;
        await logAction(userId, 'EDITOU FUNCIONÁRIO', 'employees', nome);
        toast.success("Funcionário atualizado!");
      } else {
        const { error } = await supabase.from('employees').insert(payload);
        if (error) throw error;
        await logAction(userId, 'CADASTROU FUNCIONÁRIO', 'employees', nome);
        toast.success("Funcionário cadastrado!");
      }

      router.push(`/dashboard/funcionarios/listar`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  return (
    <div className="p-8 w-full h-full animate-in fade-in duration-500 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-12 gap-8">
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">
              {isEdit ? "Editar Funcionário" : "Cadastrar Funcionário"}
            </h1>
            <p className="text-zinc-500 mt-1 font-medium">
              {isEdit ? "Atualize os dados do membro da equipe." : "Registre um novo membro da equipe do evento."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto items-start">
          <div className="space-y-8 flex flex-col">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                <div>
                  <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Local Base (Theater)</label>
                  <select 
                    className="flex h-14 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 text-sm font-medium cursor-pointer focus:ring-2 focus:ring-ruby outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                    value={theaterId}
                    onChange={e => setTheaterId(e.target.value)}
                  >
                    <option value="">Nenhum local específico</option>
                    {theaters.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              

            </div>
            </section>
          </div>

          <div className="space-y-8 flex flex-col">
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
               
               {isFreelancer && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-100 dark:border-white/5 animate-in slide-in-from-top-2">
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
                     <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Valor da Diária (R$)</label>
                     <Input 
                       placeholder="0,00" 
                       className="bg-zinc-50 dark:bg-white/5 h-14 rounded-2xl border-zinc-200 dark:border-white/10 px-6 text-lg font-mono font-bold text-zinc-900 dark:text-white transition-all focus:ring-ruby focus:border-ruby"
                       value={diaria}
                       onChange={(e) => setDiaria(e.target.value)}
                     />
                   </div>
                 </div>
               )}
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
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">Status e Observações</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="md:col-span-1">
                <label className="text-sm font-bold text-zinc-500 dark:text-zinc-400 ml-1 block pb-2">Status do Quadro</label>
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
            <textarea 
              placeholder="Detalhes sobre o colaborador, disponibilidade, habilidades extras..." 
              className="w-full flex min-h-[160px] rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ruby transition-all shadow-sm resize-none"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </section>
          </div>
        </div>

        <div className="flex justify-center max-w-7xl mx-auto pt-8 pb-32">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-ruby hover:bg-ruby/90 text-white flex items-center gap-2 cursor-pointer rounded-2xl h-14 px-12 shadow-2xl shadow-ruby/30 transition-all active:scale-95 font-bold text-lg w-full max-w-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? "Salvando..." : isEdit ? "Atualizar Funcionário" : "Salvar Funcionário"}
          </Button>
        </div>
      </div>
    </div>
  );
}
