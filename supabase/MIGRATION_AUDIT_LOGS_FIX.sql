-- =============================================================
-- SPOTLIGHT — AUDIT LOGS POLICY FIX
-- O hardening original (MIGRATION_HARDEN_RLS.sql) deixou audit_logs
-- sem INSERT policy, o que travou TODO log gravado pelo browser via
-- src/lib/audit.ts — incluindo cadastro de funcionário, evento, etc.
-- E também removeu o SELECT do dono, então o organizador não enxergava
-- nada em /dashboard/relatorios.
--
-- Esta migration restaura as políticas mínimas:
--  - INSERT: usuário só pode gravar log com user_id = auth.uid()
--    (não consegue forjar como outra pessoa)
--  - SELECT: dono lê seus próprios logs
--  - Mantém SELECT de admin por cima
--
-- Idempotente. Pode rodar várias vezes.
-- Data: 2026-05-04
-- =============================================================

DROP POLICY IF EXISTS "audit_logs_owner_insert"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_owner_select"   ON public.audit_logs;
DROP POLICY IF EXISTS "Users can see their own audit logs" ON public.audit_logs;

-- Dono insere logs como ele mesmo (não pode forjar user_id de outro).
CREATE POLICY "audit_logs_owner_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Dono lê seus próprios logs.
CREATE POLICY "audit_logs_owner_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

-- Admin mantém SELECT (criada em MIGRATION_HARDEN_RLS.sql). Nada a fazer aqui.

-- =============================================================
-- VALIDAÇÃO:
--   SELECT polname, polcmd, polroles::regrole[]
--   FROM pg_policy WHERE polrelid = 'public.audit_logs'::regclass;
--
--   -- Esperado:
--   --   audit_logs_owner_insert | a | {authenticated}  (INSERT)
--   --   audit_logs_owner_select | r | {authenticated}  (SELECT — dono)
--   --   Admins can view audit logs | r | {authenticated} (SELECT — admin)
-- =============================================================
