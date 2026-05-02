import { supabase } from "./supabase";

/**
 * Retorna o ID do usuário que "manda" no contexto atual.
 * Se o usuário logado for membro de uma equipe, retorna o ID do dono da equipe.
 * Caso contrário, retorna o próprio ID do usuário logado.
 */
export async function getContextUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verifica se este usuário é membro de alguma equipe
  const { data: membership } = await supabase
    .from('team_members')
    .select('owner_id')
    .eq('member_id', user.id)
    .single();

  if (membership) {
    return membership.owner_id;
  }

  return user.id;
}

/**
 * Retorna se o usuário atual é o dono (owner) do contexto.
 */
export async function isOwner(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('member_id', user.id)
    .single();

  return !membership; // Se não tem membership como membro, ele é o dono (ou um usuário isolado)
}
