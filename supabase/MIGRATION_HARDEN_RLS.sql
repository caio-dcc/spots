-- =============================================================
-- SPOTLIGHT — RLS HARDENING PASS
-- Aplica as diretrizes de .claude/skills/supabase-stripe-security.md
-- sobre o estado deixado por MIGRATION_BUNDLE.sql.
-- Idempotente. Pode rodar quantas vezes quiser.
-- Data: 2026-05-04
-- =============================================================

-- =============================================================
-- 1. ticket_orders — ÚNICA fonte de verdade financeira
--    Regras: client SÓ lê os próprios pedidos. INSERT/UPDATE só
--    via service_role (que ignora RLS). Sem brechas USING(true).
-- =============================================================

DROP POLICY IF EXISTS "ticket_orders_owner_read"     ON public.ticket_orders;
DROP POLICY IF EXISTS "ticket_orders_buyer_read"     ON public.ticket_orders;
DROP POLICY IF EXISTS "ticket_orders_service_insert" ON public.ticket_orders;
DROP POLICY IF EXISTS "ticket_orders_service_update" ON public.ticket_orders;

-- Dono do evento lê todos os pedidos do evento dele.
CREATE POLICY "ticket_orders_owner_read" ON public.ticket_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = ticket_orders.event_id
        AND events.user_id = (select auth.uid())
    )
  );

-- Comprador lê os próprios pedidos (drives /meus-pedidos).
CREATE POLICY "ticket_orders_buyer_read" ON public.ticket_orders
  FOR SELECT TO authenticated
  USING (buyer_email = (select auth.email()));

-- INSERT e UPDATE intencionalmente NÃO criadas: service_role
-- bypassa RLS, então o webhook do Stripe e /api/checkout (via
-- supabaseAdmin) escrevem normalmente. Qualquer outra origem é
-- bloqueada por padrão.

-- Integridade: timestamps coerentes com status.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_orders_timestamps_check') THEN
    ALTER TABLE public.ticket_orders DROP CONSTRAINT ticket_orders_timestamps_check;
  END IF;
  ALTER TABLE public.ticket_orders
    ADD CONSTRAINT ticket_orders_timestamps_check CHECK (
      (cancelled_at  IS NULL OR status = 'cancelled') AND
      (checked_in_at IS NULL OR status = 'checked_in') AND
      (paid_at       IS NULL OR status IN ('paid','checked_in','refunded'))
    );
END$$;

-- FK sem índice (custa em joins/admin queries)
CREATE INDEX IF NOT EXISTS idx_ticket_orders_benefit ON public.ticket_orders(benefit_id);

-- =============================================================
-- 2. audit_logs — somente admins LEEM. Escrita via service_role.
-- =============================================================
DROP POLICY IF EXISTS "Users can see their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs"         ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
        AND user_type = 'admin'
    )
  );
-- Sem INSERT/UPDATE policy: logs vêm sempre de rotas server-side
-- via service_role. Cliente não pode forjar registro.

-- =============================================================
-- 3. profiles — wrap auth.uid() em (select auth.uid())
-- =============================================================
DROP POLICY IF EXISTS "Users can view their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"   ON public.profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

-- =============================================================
-- 4. events — wrap + leitura pública para is_public=true
--    (necessário para /e/[slug] funcionar para visitantes
--    pré-login. A compra exige login no /api/checkout.)
-- =============================================================
DROP POLICY IF EXISTS "Users can only see their own events" ON public.events;
DROP POLICY IF EXISTS "Public can read public events"       ON public.events;

CREATE POLICY "Users can only see their own events" ON public.events
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id);

CREATE POLICY "Public can read public events" ON public.events
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);

-- event_benefits também precisa ser legível em eventos públicos
DROP POLICY IF EXISTS "Users can manage benefits for their own events" ON public.event_benefits;
DROP POLICY IF EXISTS "Public can read benefits of public events"       ON public.event_benefits;

CREATE POLICY "Users can manage benefits for their own events" ON public.event_benefits
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_benefits.event_id
        AND events.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Public can read benefits of public events" ON public.event_benefits
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_benefits.event_id
        AND events.is_public = true
        AND events.deleted_at IS NULL
    )
  );

-- =============================================================
-- 5. employees / event_staff / guests / additional_expenses
--    — wrap auth.uid()
-- =============================================================
DROP POLICY IF EXISTS "Users can only see their own employees" ON public.employees;
CREATE POLICY "Users can only see their own employees" ON public.employees
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage staff for their own events" ON public.event_staff;
CREATE POLICY "Users can manage staff for their own events" ON public.event_staff
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_staff.event_id
        AND events.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage guests for their own events" ON public.guests;
CREATE POLICY "Users can manage guests for their own events" ON public.guests
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guests.event_id
        AND events.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage expenses for their own events" ON public.additional_expenses;
CREATE POLICY "Users can manage expenses for their own events" ON public.additional_expenses
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = additional_expenses.event_id
        AND events.user_id = (select auth.uid())
    )
  );

-- =============================================================
-- 6. organization_settings + fiscal_invoices — wrap auth.uid()
-- =============================================================
DROP POLICY IF EXISTS "org_settings_owner" ON public.organization_settings;
CREATE POLICY "org_settings_owner" ON public.organization_settings
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "fiscal_invoices_owner" ON public.fiscal_invoices;
CREATE POLICY "fiscal_invoices_owner" ON public.fiscal_invoices
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id);

-- =============================================================
-- 7. Índices em FKs faltantes (Section 5)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_guests_event_id              ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_benefit_id            ON public.guests(benefit_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id         ON public.event_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_employee_id      ON public.event_staff(employee_id);
CREATE INDEX IF NOT EXISTS idx_event_benefits_event_id      ON public.event_benefits(event_id);
CREATE INDEX IF NOT EXISTS idx_additional_expenses_event_id ON public.additional_expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_event_id_v2  ON public.fiscal_invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_admin   ON public.super_admin_sessions(super_admin_id);

-- =============================================================
-- 8. Funções SECURITY DEFINER — bloquear execução direta
-- =============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- =============================================================
-- VALIDAÇÃO (cole abaixo depois de rodar):
--   SELECT polname, polcmd, polroles::regrole[]
--   FROM pg_policy WHERE polrelid = 'public.ticket_orders'::regclass;
--
--   -- Esperado:
--   --   ticket_orders_owner_read | r | {authenticated}
--   --   ticket_orders_buyer_read | r | {authenticated}
--   --   (sem INSERT/UPDATE — service_role bypassa RLS)
-- =============================================================
