import { supabaseAdmin } from "@/lib/supabase-server";
import { Users, ShoppingCart, Wallet, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

async function loadMetrics() {
  const [{ count: customerCount }, { count: organizerCount }, { count: disabledCount }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "customer"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "admin"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("access_disabled", true),
    ]);

  const { data: paid } = await supabaseAdmin
    .from("ticket_orders")
    .select("total_amount, platform_fee, net_to_producer, paid_at, created_at")
    .eq("status", "paid");

  const totalGmv = (paid ?? []).reduce((a, r) => a + Number(r.total_amount ?? 0), 0);
  const totalFees = (paid ?? []).reduce((a, r) => a + Number(r.platform_fee ?? 0), 0);
  const totalProducer = (paid ?? []).reduce((a, r) => a + Number(r.net_to_producer ?? 0), 0);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last30 = (paid ?? []).filter((r) => (r.paid_at ?? r.created_at) >= since);
  const gmv30 = last30.reduce((a, r) => a + Number(r.total_amount ?? 0), 0);
  const fees30 = last30.reduce((a, r) => a + Number(r.platform_fee ?? 0), 0);

  return {
    customers: customerCount ?? 0,
    organizers: organizerCount ?? 0,
    disabled: disabledCount ?? 0,
    paidOrders: paid?.length ?? 0,
    totalGmv,
    totalFees,
    totalProducer,
    gmv30,
    fees30,
    paid30: last30.length,
  };
}

async function loadRecentPurchases() {
  const { data } = await supabaseAdmin
    .from("ticket_orders")
    .select(
      "id, buyer_name, buyer_email, quantity, total_amount, platform_fee, status, created_at, paid_at, events:event_id ( title )",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export default async function AdminDashboard() {
  const [m, recent] = await Promise.all([loadMetrics(), loadRecentPurchases()]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">
          Painel Master
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-100 mt-1">
          Visão Geral
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Métricas em tempo real da plataforma Spotlight.
        </p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Users className="w-5 h-5 text-ruby" />}
          label="Clientes"
          value={m.customers.toLocaleString("pt-BR")}
          hint="Compradores cadastrados"
        />
        <MetricCard
          icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
          label="Organizadores"
          value={m.organizers.toLocaleString("pt-BR")}
          hint={`${m.disabled} bloqueado(s)`}
        />
        <MetricCard
          icon={<ShoppingCart className="w-5 h-5 text-emerald-400" />}
          label="Pedidos Pagos"
          value={m.paidOrders.toLocaleString("pt-BR")}
          hint={`${m.paid30} nos últimos 30d`}
        />
        <MetricCard
          icon={<Wallet className="w-5 h-5 text-sky-400" />}
          label="GMV total"
          value={fmtBRL.format(m.totalGmv)}
          hint={`${fmtBRL.format(m.gmv30)} em 30d`}
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProfitCard label="Receita da plataforma (taxas)" value={fmtBRL.format(m.totalFees)} sub={`${fmtBRL.format(m.fees30)} em 30d`} accent="ruby" />
        <ProfitCard label="Repassado a produtores" value={fmtBRL.format(m.totalProducer)} sub="Pagamentos via Stripe Connect" accent="emerald" />
        <ProfitCard
          label="Ticket médio"
          value={
            m.paidOrders === 0
              ? "—"
              : fmtBRL.format(m.totalGmv / m.paidOrders)
          }
          sub={`${m.paidOrders} pedidos`}
          accent="sky"
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
            Últimas compras
          </h2>
          <Link
            href="/admin/view/clientes"
            className="text-[10px] uppercase tracking-widest font-black text-ruby hover:text-ruby/80"
          >
            Ver todas →
          </Link>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3 text-left font-black">Comprador</th>
                  <th className="px-4 py-3 text-left font-black">Evento</th>
                  <th className="px-4 py-3 text-right font-black">Qtd</th>
                  <th className="px-4 py-3 text-right font-black">Total</th>
                  <th className="px-4 py-3 text-right font-black">Taxa</th>
                  <th className="px-4 py-3 text-left font-black">Status</th>
                  <th className="px-4 py-3 text-left font-black">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-600">
                      Nenhuma compra registrada ainda.
                    </td>
                  </tr>
                ) : (
                  recent.map((r) => {
                    const event = Array.isArray(r.events) ? r.events[0] : r.events;
                    return (
                      <tr key={r.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-4 py-3 text-zinc-200">
                          <div className="font-semibold">{r.buyer_name ?? "—"}</div>
                          <div className="text-xs text-zinc-500">{r.buyer_email ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{event?.title ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-zinc-300">{r.quantity}</td>
                        <td className="px-4 py-3 text-right text-zinc-100 font-black">
                          {fmtBRL.format(Number(r.total_amount ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          {fmtBRL.format(Number(r.platform_fee ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">
                          {new Date(r.paid_at ?? r.created_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-black text-zinc-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function ProfitCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "ruby" | "emerald" | "sky";
}) {
  const ring = {
    ruby: "ring-ruby/30 from-ruby/10",
    emerald: "ring-emerald-400/20 from-emerald-400/10",
    sky: "ring-sky-400/20 from-sky-400/10",
  }[accent];
  return (
    <div className={`relative bg-gradient-to-br ${ring} to-zinc-900/40 border border-zinc-800 rounded-2xl p-5 ring-1`}>
      <div className="text-[10px] uppercase tracking-widest font-black text-zinc-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-zinc-100">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    cancelled: { label: "Cancelado", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
    refunded: { label: "Reembolsado", cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
    checked_in: { label: "Check-in", cls: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  };
  const v = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-widest font-black ${v.cls}`}>
      {v.label}
    </span>
  );
}
