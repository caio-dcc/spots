"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RotatingTicketQr } from "@/components/RotatingTicketQr";
import { Loader2 } from "lucide-react";

type Row = {
  id: string;
  status: string;
  quantity: number | null;
  ticket_code: string | null;
  created_at: string | null;
  events: { title: string | null; event_date: string | null } | null;
};

function MeusPedidosInner() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAuthed(!!session);

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ticket_orders")
        .select("id,status,quantity,ticket_code,created_at,events(title,event_date)")
        .order("created_at", { ascending: false });

      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    };

    void load();
  }, []);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-ruby" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-6 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-black text-white">Meus pedidos</h1>
        <p className="text-zinc-400 mt-4 text-sm">Faça login para ver seus ingressos.</p>
        <Link
          href="/login?next=/meus-pedidos"
          className="inline-block mt-8 rounded-full bg-ruby px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-white tracking-tight text-center">Meus pedidos</h1>
      <p className="text-center text-zinc-400 text-sm mt-2">
        Pagamentos confirmados exibem um QR dinâmico (renova a cada 15s). O check-in é feito pelo staff no painel do organizador.
      </p>

      {success === "1" && (
        <p className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-center text-sm font-bold text-green-400">
          Pagamento recebido (ou em confirmação). Atualize em instantes se o status ainda estiver pendente.
        </p>
      )}
      {canceled === "1" && (
        <p className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm font-bold text-amber-400">
          Checkout cancelado. Você pode tentar novamente quando quiser.
        </p>
      )}

      <div className="mt-10 space-y-8">
        {rows.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-8 py-12 text-center text-zinc-400 font-medium">
            Nenhum pedido ainda.{" "}
            <Link href="/eventos-publicos" className="text-ruby font-black underline-offset-4 hover:underline">
              Ver eventos públicos
            </Link>
          </div>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 flex flex-col md:flex-row gap-8 md:items-start md:justify-between"
            >
              <div>
                <h2 className="text-lg font-black text-white">{r.events?.title ?? "Evento"}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">
                  {r.events?.event_date
                    ? new Date(r.events.event_date).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
                <dl className="mt-4 space-y-1 text-sm text-zinc-400">
                  <div>
                    <dt className="inline font-bold text-zinc-500">Código: </dt>
                    <dd className="inline font-mono text-white">{r.ticket_code ?? r.id.slice(0, 8)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-bold text-zinc-500">Status: </dt>
                    <dd className="inline text-white uppercase">{r.status}</dd>
                  </div>
                  <div>
                    <dt className="inline font-bold text-zinc-500">Quantidade: </dt>
                    <dd className="inline text-white">{r.quantity ?? 1}</dd>
                  </div>
                </dl>
              </div>

              <RotatingTicketQr orderId={r.id} enabled={r.status === "paid"} />
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default function MeusPedidosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-28 flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-ruby" />
        </div>
      }
    >
      <MeusPedidosInner />
    </Suspense>
  );
}
