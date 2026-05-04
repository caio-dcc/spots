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

  const [{ count: customerCount }, { count: organizerCount }, { count: disabledCount }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "customer"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "admin"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("access_disabled", true),
    ]);

  // Receita: somar total_amount + platform_fee dos pedidos pagos.
  const { data: paidAgg } = await supabaseAdmin
    .from("ticket_orders")
    .select("total_amount, platform_fee, net_to_producer, status, created_at, paid_at")
    .eq("status", "paid");

  const totalGmv = (paidAgg ?? []).reduce(
    (acc, r) => acc + Number(r.total_amount ?? 0),
    0,
  );
  const totalPlatformFees = (paidAgg ?? []).reduce(
    (acc, r) => acc + Number(r.platform_fee ?? 0),
    0,
  );
  const totalProducerNet = (paidAgg ?? []).reduce(
    (acc, r) => acc + Number(r.net_to_producer ?? 0),
    0,
  );

  // Últimos 30 dias.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last30 = (paidAgg ?? []).filter(
    (r) => (r.paid_at ?? r.created_at) >= since,
  );
  const gmv30 = last30.reduce((acc, r) => acc + Number(r.total_amount ?? 0), 0);
  const fees30 = last30.reduce((acc, r) => acc + Number(r.platform_fee ?? 0), 0);

  return NextResponse.json({
    customers: customerCount ?? 0,
    organizers: organizerCount ?? 0,
    disabledOrganizers: disabledCount ?? 0,
    totals: {
      gmv: totalGmv,
      platformFees: totalPlatformFees,
      producerNet: totalProducerNet,
      paidOrders: paidAgg?.length ?? 0,
    },
    last30: {
      gmv: gmv30,
      platformFees: fees30,
      paidOrders: last30.length,
    },
  });
}
