import { supabase } from "./supabase";

export async function logAction(
  theaterId: string,
  action: string,
  targetTable: string,
  targetId?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar o username do user_roles
    const { data: role } = await supabase
      .from('user_roles')
      .select('username')
      .eq('user_id', user.id)
      .eq('theater_id', theaterId)
      .single();

    await supabase.from('audit_logs').insert({
      theater_id: theaterId,
      user_id: user.id,
      username: role?.username || user.email || 'Usuário Desconhecido',
      action,
      target_table: targetTable,
      target_id: targetId
    });
  } catch (error) {
    console.error("Erro ao registrar log de auditoria:", error);
  }
}
