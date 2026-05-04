import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const VALID_PLANS = ["essencial", "profissional", "enterprise"] as const;
type Plan = (typeof VALID_PLANS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.access_disabled === "boolean") {
    update.access_disabled = body.access_disabled;
  }
  if (typeof body.plan_tier === "string" && (VALID_PLANS as readonly string[]).includes(body.plan_tier)) {
    update.plan_tier = body.plan_tier as Plan;
    update.plan_updated_at = new Date().toISOString();
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido enviado" }, { status: 400 });
  }

  const { data: before } = await supabaseAdmin
    .from("profiles")
    .select("access_disabled, plan_tier")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .eq("user_type", "admin")
    .select("id, access_disabled, plan_tier, plan_updated_at")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Organizador não encontrado" },
      { status: 404 },
    );
  }

  await supabaseAdmin.from("audit_logs").insert({
    user_id: null,
    action: "super_admin_update_organizer",
    entity_type: "profile",
    entity_id: id,
    before_value: before ?? null,
    after_value: data,
  });

  return NextResponse.json({ organizer: data });
}
