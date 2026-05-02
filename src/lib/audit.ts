import { supabase } from "./supabase";

export async function logAction(
  contextId: string, // Pode ser o ID do registro afetado ou o ID do usuário
  action: string,
  targetTable: string,
  targetId?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const username = user.email || 'Usuário Desconhecido';

    const isUuid = (str?: string) => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    const finalTargetId = isUuid(targetId) ? targetId : null;
    const finalAction = !isUuid(targetId) && targetId 
      ? `${action.toUpperCase()} (${targetId})` 
      : action.toUpperCase();

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      username: username,
      action: finalAction,
      target_table: targetTable,
      target_id: finalTargetId
    });

    if (error) {
      console.warn("Aviso: Falha ao gravar log de auditoria. Verifique as políticas de RLS.", error.message);
    }
  } catch (error) {
    console.error("Erro crítico ao registrar log de auditoria:", error);
  }
}
