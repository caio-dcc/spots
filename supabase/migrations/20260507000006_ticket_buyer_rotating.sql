-- Ingressos: comprador vinculado ao usuário + leitura por membros da organização do evento
ALTER TABLE public.ticket_orders
  ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_orders_buyer_user ON public.ticket_orders(buyer_user_id);

DROP POLICY IF EXISTS "ticket_orders_owner_read" ON public.ticket_orders;
CREATE POLICY "ticket_orders_owner_read" ON public.ticket_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_orders.event_id
      AND (
        e.organization_id IN (SELECT public.current_user_orgs())
        OR e.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "ticket_orders_buyer_read" ON public.ticket_orders;
CREATE POLICY "ticket_orders_buyer_read" ON public.ticket_orders
  FOR SELECT TO authenticated
  USING (
    buyer_email = (SELECT auth.email())
    OR buyer_user_id = (SELECT auth.uid())
  );
