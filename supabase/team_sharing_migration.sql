-- ============================================================
-- Migration: Funcionalidade de Equipe e Compartilhamento
-- Objetivo: Permitir que usuários compartilhem seus dados com outros
-- ============================================================

-- 1. Criar tabela de membros da equipe
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'manager', -- 'manager', 'viewer'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, member_id)
);

-- 2. Habilitar RLS na team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para team_members
-- Donos podem gerenciar seus membros
CREATE POLICY "Owners can manage team members" 
    ON team_members FOR ALL 
    USING (auth.uid() = owner_id);

-- Membros podem ver quem são seus donos
CREATE POLICY "Members can see their ownership" 
    ON team_members FOR SELECT 
    USING (auth.uid() = member_id);

-- 4. Atualizar Políticas de Segurança (RLS) para permitir acesso da equipe

-- EVENTS
DROP POLICY IF EXISTS "Users see own events" ON events;
CREATE POLICY "Users and team manage events"
  ON events FOR ALL
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = events.user_id 
      AND team_members.member_id = auth.uid()
    )
  );

-- EMPLOYEES
DROP POLICY IF EXISTS "Users see own employees" ON employees;
CREATE POLICY "Users and team manage employees"
  ON employees FOR ALL
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = employees.user_id 
      AND team_members.member_id = auth.uid()
    )
  );

-- GUESTS
-- (Nota: guests são vinculados a events, a política de events já ajuda, mas vamos garantir)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage guests via event ownership" ON guests;
CREATE POLICY "Users manage guests via event ownership"
  ON guests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = guests.event_id
      AND (
        events.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members 
          WHERE team_members.owner_id = events.user_id 
          AND team_members.member_id = auth.uid()
        )
      )
    )
  );

-- AUDIT LOGS
DROP POLICY IF EXISTS "Users see own audit logs" ON audit_logs;
CREATE POLICY "Users and team see audit logs"
  ON audit_logs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = audit_logs.user_id 
      AND team_members.member_id = auth.uid()
    )
  );
