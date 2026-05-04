-- =============================================================
-- Fix: unifica check-in de pedidos Stripe e QR scanner
-- Data: 2026-05-04
-- Pré-requisito: features_monetization.sql (cria ticket_orders) e
--                new_unified_schema.sql (cria guests).
-- =============================================================

-- 0) Pré-condição: garantir que as tabelas-base existam antes de alterar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'ticket_orders') THEN
    RAISE EXCEPTION 'Tabela public.ticket_orders nao existe. Rode supabase/features_monetization.sql antes.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'guests') THEN
    RAISE EXCEPTION 'Tabela public.guests nao existe. Rode supabase/new_unified_schema.sql antes.';
  END IF;
END$$;

-- 1) ticket_orders: permitir status 'checked_in', adicionar colunas usadas pelo /api/tickets/validate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ticket_orders_status_check'
  ) THEN
    ALTER TABLE public.ticket_orders DROP CONSTRAINT ticket_orders_status_check;
  END IF;
END$$;

ALTER TABLE public.ticket_orders
  ADD CONSTRAINT ticket_orders_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'checked_in'));

ALTER TABLE public.ticket_orders ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.ticket_orders ADD COLUMN IF NOT EXISTS staff_id UUID;

-- 2) guests: ligar pedido + QR para que o scanner consiga atualizar contadores por ingresso
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.ticket_orders(id) ON DELETE SET NULL;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_qr_code ON public.guests(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guests_order_id ON public.guests(order_id);

-- 3) Backfill: cada ticket_order pago sem guest associado ganha um.
--    Isso conserta pedidos antigos que ficaram órfãos.
INSERT INTO public.guests (event_id, benefit_id, name, quantity, checked_in, qr_code, order_id, created_at)
SELECT o.event_id,
       o.benefit_id,
       o.buyer_name,
       o.quantity,
       (o.status = 'checked_in'),
       o.qr_code,
       o.id,
       o.created_at
FROM public.ticket_orders o
LEFT JOIN public.guests g ON g.order_id = o.id
WHERE o.status IN ('paid', 'checked_in')
  AND g.id IS NULL
  AND o.qr_code IS NOT NULL;
