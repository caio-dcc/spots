-- ============================================================
-- Migration: Tornar theater_id opcional e usá-lo como localidade
-- Objetivo: Remover restrição NOT NULL para permitir a transição
-- ============================================================

-- 1. Remover obrigatoriedade de theater_id em employees
ALTER TABLE employees ALTER COLUMN theater_id DROP NOT NULL;

-- 2. Remover obrigatoriedade de theater_id em events
ALTER TABLE events ALTER COLUMN theater_id DROP NOT NULL;

-- 3. Garantir que existam as tabelas de suporte para localidade (teatros)
CREATE TABLE IF NOT EXISTS theaters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    capacity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS para theaters
ALTER TABLE theaters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own locations" ON theaters;
CREATE POLICY "Users can manage their own locations" ON theaters
    FOR ALL USING (auth.uid() = user_id);
