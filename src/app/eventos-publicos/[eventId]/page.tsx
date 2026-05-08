"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Benefit = { id: string; nome: string; valor: number };

export default function EventoPublicoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.eventId === "string" ? params.eventId : "";

  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [benefitId, setBenefitId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id,title,event_date,details,is_public")
        .eq("id", eventId)
        .maybeSingle();

      if (evErr || !ev || !ev.is_public) {
        toast.error("Evento não encontrado ou não está público.");
        router.push("/eventos-publicos");
        return;
      }

      setEventTitle(ev.title ?? "");
      setEventDate(ev.event_date ?? null);
      setDetails(ev.details ?? null);

      const { data: bens } = await supabase
        .from("event_benefits")
        .select("id,nome,valor")
        .eq("event_id", eventId)
        .order("nome");

      const list = (bens ?? []) as Benefit[];
      setBenefits(list);
      if (list.length > 0) setBenefitId(list[0].id);

      if (session?.user) {
        const meta = session.user.user_metadata as Record<string, string | undefined>;
        setBuyerEmail(session.user.email ?? "");
        setBuyerName(meta?.full_name ?? meta?.name ?? "");
      }

      setLoading(false);
    };

    void load();
  }, [eventId, router]);

  const selectedBenefit = useMemo(
    () => benefits.find((b) => b.id === benefitId) ?? null,
    [benefits, benefitId],
  );

  const handleCheckout = async () => {
    if (!eventId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Faça login como cliente para comprar.");
      router.push(`/login?next=/eventos-publicos/${eventId}`);
      return;
    }

    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetch(`${origin}/api/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          Origin: origin,
        },
        body: JSON.stringify({
          eventId,
          benefitId: benefits.length > 0 ? benefitId : null,
          quantity,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim().toLowerCase(),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Falha ao iniciar pagamento");
      }
      const url = body.checkoutUrl as string | undefined;
      if (url) window.location.href = url;
      else throw new Error("URL de checkout ausente");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao iniciar checkout");
    } finally {
      setSubmitting(false);
    }
  };

  if (!eventId) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-28 flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-ruby" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-6 max-w-xl mx-auto">
      <Link
        href="/eventos-publicos"
        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <h1 className="text-3xl font-black text-white tracking-tight">{eventTitle}</h1>
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
        {eventDate ? new Date(eventDate).toLocaleDateString("pt-BR") : "Data a definir"}
      </p>
      {details && <p className="text-sm text-zinc-400 mt-6 leading-relaxed">{details}</p>}

      <div className="mt-10 space-y-6 rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
        {benefits.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo de ingresso</label>
            <select
              className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-ruby/40"
              value={benefitId ?? ""}
              onChange={(e) => setBenefitId(e.target.value || null)}
            >
              {benefits.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome} — R${" "}
                  {Number(b.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Quantidade</label>
          <Input
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
            className="h-12 rounded-xl bg-black/40 border-white/10 text-white font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nome</label>
          <Input
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="h-12 rounded-xl bg-black/40 border-white/10 text-white font-bold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">E-mail (mesmo da conta logada)</label>
          <Input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            className="h-12 rounded-xl bg-black/40 border-white/10 text-white font-bold"
          />
        </div>

        {selectedBenefit && (
          <p className="text-sm font-bold text-ruby">
            Total estimado: R${" "}
            {(Number(selectedBenefit.valor) * quantity).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </p>
        )}

        <Button
          type="button"
          onClick={() => void handleCheckout()}
          disabled={submitting}
          className="w-full h-14 rounded-2xl bg-ruby hover:bg-ruby/90 text-white font-black uppercase tracking-widest text-[10px]"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Ir para pagamento (Stripe)"}
        </Button>
      </div>
    </div>
  );
}
