"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, DollarSign, BarChart3, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stripe")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-ruby" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="p-10 text-center text-zinc-500">
        <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-black text-zinc-300">Erro ao carregar finanças</h2>
        <p className="text-sm mt-2">{data?.error || "Verifique as configurações do Stripe."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">
          Painel Financeiro
        </p>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-100 mt-1">
          Conciliação & Stripe
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Dados extraídos diretamente da conta plataforma.
        </p>
      </header>

      {/* Main Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceCard
          icon={<Wallet className="w-5 h-5 text-emerald-400" />}
          label="Saldo Disponível"
          value={fmtBRL.format(data.available)}
          hint="Pronto para saque/payout"
        />
        <FinanceCard
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
          label="Saldo Pendente"
          value={fmtBRL.format(data.pending)}
          hint="Processando pela rede bancária"
        />
        <FinanceCard
          icon={<DollarSign className="w-5 h-5 text-ruby" />}
          label="Volume (30d)"
          value={fmtBRL.format(data.volume30d)}
          hint="Total processado (GMV)"
        />
        <FinanceCard
          icon={<BarChart3 className="w-5 h-5 text-sky-400" />}
          label="Taxas (30d)"
          value={fmtBRL.format(data.fees30d)}
          hint="Receita líquida da plataforma"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-8">
            Evolução (Últimos 7 dias)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#810B14" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#810B14" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  hide 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}
                  labelStyle={{ color: '#71717a', fontSize: '10px', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#810B14" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">
            Top Eventos (GMV)
          </h2>
          <div className="space-y-4">
            {data.topEvents.map((event: any, i: number) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-ruby transition-colors truncate max-w-[180px]">
                    {event.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">
                    {i === 0 ? "🏆 Campeão de vendas" : `Posição #${i + 1}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-zinc-100">{fmtBRL.format(event.gmv)}</p>
                  <div className="w-16 h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-ruby" 
                      style={{ width: `${(event.gmv / data.topEvents[0].gmv) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
          Transações Recentes (Stripe)
        </h2>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3 text-left font-black">ID Transação</th>
                  <th className="px-4 py-3 text-left font-black">Cliente</th>
                  <th className="px-4 py-3 text-right font-black">Valor</th>
                  <th className="px-4 py-3 text-left font-black">Status</th>
                  <th className="px-4 py-3 text-left font-black">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.recentCharges.map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{c.id}</td>
                    <td className="px-4 py-3 text-zinc-300">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-right font-black text-zinc-100">{fmtBRL.format(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        c.status === "succeeded" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(c.created * 1000).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function FinanceCard({
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
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">
          {label}
        </span>
      </div>
      <div className="text-2xl font-black text-zinc-100 tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">{hint}</div>}
    </div>
  );
}
