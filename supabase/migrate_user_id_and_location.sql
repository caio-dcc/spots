-- ============================================================
-- Migration: Adicionar user_id e location às tabelas principais
-- Objetivo: Associar eventos e funcionários diretamente ao usuário Auth
-- sem depender de tabelas intermediárias (user_roles, organizations)
-- ============================================================

-- 1. Adicionar user_id na tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT;

-- 2. Adicionar user_id na tabela employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- 4. RLS Policies para events (leitura e escrita por user_id)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON events;
CREATE POLICY "Users see own events"
  ON events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own events" ON events;
CREATE POLICY "Users insert own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own events" ON events;
CREATE POLICY "Users update own events"
  ON events FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own events" ON events;
CREATE POLICY "Users delete own events"
  ON events FOR DELETE
  USING (auth.uid() = user_id);

-- 5. RLS Policies para employees (leitura e escrita por user_id)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own employees" ON employees;
CREATE POLICY "Users see own employees"
  ON employees FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own employees" ON employees;
CREATE POLICY "Users insert own employees"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own employees" ON employees;
CREATE POLICY "Users update own employees"
  ON employees FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own employees" ON employees;
CREATE POLICY "Users delete own employees"
  ON employees FOR DELETE
  USING (auth.uid() = user_id);
