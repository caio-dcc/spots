import { supabaseAdmin } from "@/lib/supabase-server";
import { OrganizersTable } from "./_components/OrganizersTable";

export const dynamic = "force-dynamic";

async function loadOrganizers() {
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone_number, plan_tier, access_disabled, created_at, plan_updated_at")
    .eq("user_type", "admin")
    .order("created_at", { ascending: false });

  const ids = (profiles ?? []).map((p) => p.id);
  const emails: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: page } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of page?.users ?? []) {
      if (u.email && ids.includes(u.id)) emails[u.id] = u.email;
    }
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    email: emails[p.id] ?? null,
  }));
}

export default async function ControlOrganizers() {
  const organizers = await loadOrganizers();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">
          Painel Master
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-100 mt-1">
          Controle de Organizadores
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ative/desative acesso e ajuste o plano de cada organizador.
        </p>
      </header>

      <OrganizersTable initial={organizers} />
    </div>
  );
}
