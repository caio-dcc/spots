-- ============================================================
-- MASTER MIGRATION: SPOTLIGHT v2 (Full Schema Fix)
-- Ordem correta: Colunas -> Tabelas Auxiliares -> RLS
-- ============================================================

-- 1. DESABILITAR RLS E LIMPAR CONFLITOS
ALTER TABLE IF EXISTS public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON public.events;
DROP POLICY IF EXISTS "Users and team manage events" ON public.events;
DROP POLICY IF EXISTS "Users see own employees" ON public.employees;
DROP POLICY IF EXISTS "Users and team manage employees" ON public.employees;
DROP POLICY IF EXISTS "Users see their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users and team see audit logs" ON public.audit_logs;

DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_employees_user_id;

-- 2. ADIÇÃO DE COLUNAS (Ordem Crítica)
-- Tabela: events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS theater_id UUID;
ALTER TABLE public.events ALTER COLUMN theater_id DROP NOT NULL;

-- Tabela: employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_contracted BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS theater_id UUID;
ALTER TABLE public.employees ALTER COLUMN theater_id DROP NOT NULL;

-- Tabela: audit_logs (Muitas vezes esquecida)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- 3. TABELAS DE SUPORTE
-- Garantir colunas em theaters (caso a tabela ja exista)
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.theaters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    capacity INTEGER DEFAULT 0,
    rent_price NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'manager',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, member_id)
);

-- 4. SEGURANÇA (RLS) E ÍNDICES
ALTER TABLE IF EXISTS public.theaters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Theaters
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='theaters' AND column_name='user_id') THEN
        DROP POLICY IF EXISTS "Users can manage their own locations" ON public.theaters;
        EXECUTE 'CREATE POLICY "Users can manage their own locations" ON public.theaters FOR ALL USING (auth.uid() = user_id)';
    ELSE
        RAISE WARNING 'Coluna user_id nao encontrada em theaters';
    END IF;

    -- Team Members
    DROP POLICY IF EXISTS "Owners can manage team members" ON public.team_members;
    EXECUTE 'CREATE POLICY "Owners can manage team members" ON public.team_members FOR ALL USING (auth.uid() = owner_id)';
    DROP POLICY IF EXISTS "Members can see their ownership" ON public.team_members;
    EXECUTE 'CREATE POLICY "Members can see their ownership" ON public.team_members FOR SELECT USING (auth.uid() = member_id)';

    -- Events
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='user_id') THEN
        EXECUTE 'CREATE POLICY "Users and team manage events" ON public.events FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.team_members WHERE owner_id = events.user_id AND member_id = auth.uid()))';
    ELSE
        RAISE WARNING 'ERRO CRITICO: Coluna user_id nao encontrada em events mesmo apos ADD COLUMN!';
    END IF;

    -- Employees
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='user_id') THEN
        EXECUTE 'CREATE POLICY "Users and team manage employees" ON public.employees FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.team_members WHERE owner_id = employees.user_id AND member_id = auth.uid()))';
    ELSE
        RAISE WARNING 'ERRO CRITICO: Coluna user_id nao encontrada em employees mesmo apos ADD COLUMN!';
    END IF;

    -- Audit Logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_id') THEN
        EXECUTE 'CREATE POLICY "Users and team see audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.team_members WHERE owner_id = audit_logs.user_id AND member_id = auth.uid()))';
    ELSE
        RAISE WARNING 'ERRO CRITICO: Coluna user_id nao encontrada em audit_logs!';
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_member ON team_members(member_id);
