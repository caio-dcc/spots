"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TICKET_QR_WINDOW_MS } from "@/lib/ticket-qr-rotate";
import { Loader2 } from "lucide-react";

type Props = {
  orderId: string;
  /** só exibir QR dinâmico quando o ingresso está pago */
  enabled: boolean;
};

export function RotatingTicketQr({ orderId, enabled }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sessão expirada — faça login novamente.");
      return;
    }
    const res = await fetch(`/api/tickets/rotate?orderId=${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Não foi possível atualizar o QR.");
      return;
    }
    const body = (await res.json()) as { token?: string };
    if (!body.token) {
      setError("Resposta inválida do servidor.");
      return;
    }
    setError(null);
    setToken(body.token);
  }, [orderId]);

  useEffect(() => {
    if (!enabled) {
      setToken(null);
      setImgSrc(null);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      setLoading(true);
      await fetchToken();
      setLoading(false);
    };

    void tick();
    interval = setInterval(() => void tick(), Math.max(8_000, TICKET_QR_WINDOW_MS - 2_000));

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [enabled, fetchToken]);

  useEffect(() => {
    if (!token) {
      setImgSrc(null);
      return;
    }
    let cancelled = false;
    void import("qrcode").then(async ({ default: QRCode }) => {
      try {
        const url = await QRCode.toDataURL(token, { margin: 1, width: 240, errorCorrectionLevel: "M" });
        if (!cancelled) setImgSrc(url);
      } catch {
        if (!cancelled) setImgSrc(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!enabled) return null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-ruby/80 text-center">
        QR atualizado a cada {TICKET_QR_WINDOW_MS / 1000}s · anti-print
      </p>
      <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-white p-3">
        {loading && !imgSrc ? (
          <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
        ) : imgSrc ? (
          // data URL gerado no cliente — img evita restrições do next/image
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="QR do ingresso" width={240} height={240} className="rounded-lg" />
        ) : (
          <span className="text-center text-xs font-bold text-zinc-500 px-4">
            {error ?? "Carregando QR…"}
          </span>
        )}
      </div>
      {error && imgSrc && (
        <p className="text-[10px] font-bold text-amber-500 text-center max-w-[260px]">{error}</p>
      )}
    </div>
  );
}
