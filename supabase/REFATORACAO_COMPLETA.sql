-- ============================================================
-- REFATORAÇÃO COMPLETA: SPOTLIGHT v3 (Baseado em fluxo.md)
-- Ordem: Perfis -> Colunas -> Tabelas -> RLS
-- ============================================================

-- 1. EXTENSÕES E PREPARAÇÃO
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PERFIS DE USUÁRIOS (Planos e Limites)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'unlimited'
    location_limit INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, subscription_tier, location_limit)
  VALUES (new.id, new.email, 'free', 1);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. ADIÇÃO DE COLUNAS EM TABELAS EXISTENTES
-- Tabela: events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS theater_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto'; -- 'aberto', 'iniciado', 'finalizado'
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS dev_fee NUMERIC(15,2) DEFAULT 0; -- 5% do valor do evento
ALTER TABLE public.events ALTER COLUMN theater_id DROP NOT NULL;

-- Tabela: employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_contracted BOOLEAN DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS theater_id UUID;
ALTER TABLE public.employees ALTER COLUMN theater_id DROP NOT NULL;

-- Tabela: guests
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS final_status TEXT DEFAULT 'pendente'; -- 'presente', 'ausente'

-- Tabela: audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. TABELAS DE SUPORTE
-- Tabela: theaters (Locais)
-- Garantir colunas se ja existir
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
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

-- Tabela: team_members (Equipe Compartilhada)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'manager',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, member_id)
);

-- 5. SEGURANÇA (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theaters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Políticas User Profiles
DROP POLICY IF EXISTS "Users can see own profile" ON user_profiles;
CREATE POLICY "Users can see own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);

-- Políticas Locais
DROP POLICY IF EXISTS "Users and team manage locations" ON theaters;
CREATE POLICY "Users and team manage locations" ON theaters FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM team_members WHERE owner_id = theaters.user_id AND member_id = auth.uid())
);

-- Políticas Equipe
DROP POLICY IF EXISTS "Owners manage team" ON team_members;
CREATE POLICY "Owners manage team" ON team_members FOR ALL USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Members see team" ON team_members;
CREATE POLICY "Members see team" ON team_members FOR SELECT USING (auth.uid() = member_id);

-- Políticas Eventos (Dono + Equipe)
DROP POLICY IF EXISTS "Users and team manage events" ON events;
CREATE POLICY "Users and team manage events" ON events FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM team_members WHERE owner_id = events.user_id AND member_id = auth.uid())
);

-- Políticas Funcionários (Dono + Equipe)
DROP POLICY IF EXISTS "Users and team manage employees" ON employees;
CREATE POLICY "Users and team manage employees" ON employees FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM team_members WHERE owner_id = employees.user_id AND member_id = auth.uid())
);

-- Políticas Convidados
DROP POLICY IF EXISTS "Users and team manage guests" ON guests;
CREATE POLICY "Users and team manage guests" ON guests FOR ALL USING (
    EXISTS (SELECT 1 FROM events WHERE id = guests.event_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM team_members WHERE owner_id = events.user_id AND member_id = auth.uid())))
);

-- Políticas Auditoria
DROP POLICY IF EXISTS "Users and team see audit" ON audit_logs;
CREATE POLICY "Users and team see audit" ON audit_logs FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM team_members WHERE owner_id = audit_logs.user_id AND member_id = auth.uid())
);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_theaters_user_id ON theaters(user_id);
CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_member ON team_members(member_id);
