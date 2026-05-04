import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, phone_number, plan_tier, access_disabled, created_at, plan_updated_at",
    )
    .eq("user_type", "admin")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Buscar email de auth.users para cada organizador.
  const ids = (data ?? []).map((p) => p.id);
  const emails: Record<string, string> = {};
  if (ids.length > 0) {
    // listUsers tem paginação; para a 1ª página (até 1000) é suficiente para MVP.
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const u of usersPage?.users ?? []) {
      if (u.email && ids.includes(u.id)) emails[u.id] = u.email;
    }
  }

  const organizers = (data ?? []).map((p) => ({
    ...p,
    email: emails[p.id] ?? null,
  }));

  return NextResponse.json({ organizers });
}
