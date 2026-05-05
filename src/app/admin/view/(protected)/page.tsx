import { supabaseAdmin } from "@/lib/supabase-server";
import { Users, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";


async function loadMetrics() {
  const [{ count: organizerCount }, { count: disabledCount }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("user_type", "admin"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("access_disabled", true),
    ]);

  const { count: eventCount } = await supabaseAdmin
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  return {
    organizers: organizerCount ?? 0,
    disabled: disabledCount ?? 0,
    activeEvents: eventCount ?? 0,
  };
}

export default async function AdminDashboard() {
  const m = await loadMetrics();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">
          Painel Master ERP
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-100 mt-1">
          Visão Geral da Plataforma
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestão de organizadores e produções ativas.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={<ShieldAlert className="w-5 h-5 text-ruby" />}
          label="Organizadores"
          value={m.organizers.toLocaleString("pt-BR")}
          hint={`${m.disabled} bloqueado(s)`}
        />
        <MetricCard
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          label="Produções Ativas"
          value={m.activeEvents.toLocaleString("pt-BR")}
          hint="Total de eventos no sistema"
        />
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-center">
          <Link 
            href="/admin/view/control-organizers"
            className="w-full py-3 rounded-xl bg-ruby text-white font-black uppercase text-[10px] tracking-widest text-center transition-all hover:bg-ruby/90 shadow-lg shadow-ruby/20"
          >
            Gerenciar Organizadores
          </Link>
        </div>
      </section>

      <section className="bg-zinc-900/20 border border-zinc-800/50 rounded-[2rem] p-8">
        <div className="max-w-2xl">
          <h2 className="text-lg font-black text-zinc-100 uppercase tracking-tighter">Foco em Produção Cultural</h2>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Esta instância do Spotlight está configurada em modo **ERP Organizador**. 
            As funcionalidades de venda de ingressos foram movidas para a branch de legado, 
            mantendo este ambiente focado exclusivamente na gestão de backstage, staff e finanças de produção.
          </p>
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
