# SQL History — Spotlight

**Purpose:** Single-file backup of every `.sql` migration that has lived in this project.
Originals were removed from `supabase/migrations/` per project owner directive (2026-05-05) — this file is the authoritative recovery record. To rebuild the database on a fresh deploy, paste the sections below into Supabase SQL Editor in chronological order, or copy them back into `supabase/migrations/` with their original filenames before running `supabase db push`.

**Ordered by:** filename timestamp (chronological).

---

## 2026-04-23 00:00:00 — `20260423000000_initial_schema.sql`

**Purpose:** Initial schema for Teatro Flow. Creates `events`, `guests`, `tickets` tables with RLS enabled.

```sql
-- Initial Schema for Teatro Flow

CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    seat_number TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow authenticated users to read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read guests" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to read tickets" ON public.tickets FOR SELECT TO authenticated USING (true);

-- Allow full access for service role or admin (can be refined later)
CREATE POLICY "Allow full access to events for authenticated" ON public.events FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to guests for authenticated" ON public.guests FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to tickets for authenticated" ON public.tickets FOR ALL TO authenticated USING (true);
```

---

## 2026-05-04 16:40:00 — `20260504164000_stripe_webhook_idempotency.sql`

**Purpose:** Adds `stripe_webhook_events` table to deduplicate Stripe webhook deliveries (ticket-sales side). Index on `processed_at DESC` for operational audit queries.

**Note for ERP branch (`main`):** This migration is only relevant on `ticket-sales-legacy`. It's preserved here for the historical record but the `stripe_webhook_events` table is unused by the ERP product.

```sql
-- Idempotencia para eventos de webhook Stripe
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Indice auxiliar para auditoria operacional
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events (processed_at DESC);
```

---

## ERP-specific schema (planned, 2026-05-05+)

The ERP repurpose (this branch) will need new tables for:
- `expenses` — line-item costs per event (rent, staff, marketing, materials)
- `revenues` — line-item earnings per event (manually entered or imported)
- `employees` — staff associated with the producer/promoter
- `event_finance_summary` — view materializing expense/revenue totals per event

These will be added as a new migration (`SQL_history.md` will be appended) once the schema is finalized with the owner.

---

## Legacy SQL files (consolidated 2026-05-05)

The 36 SQL files below previously lived in `supabase/` (NOT `supabase/migrations/`) as ad-hoc patches that were applied via the Supabase SQL Editor over the project's history. On 2026-05-05 they were consolidated into this file and the originals were deleted from disk.

**Ordering:** by the timestamp of the commit that first introduced each file (`git log --diff-filter=A --follow --format=%aI -- <file> | tail -1`). All 36 files were tracked in git, so no mtime fallback was needed. Many files share an identical commit timestamp because they were committed in batches; within each batch, files are sorted alphabetically by filename.

**Exception — `supabase/seed.sql`:** included as a separate "Seed data" section at the end. The original file is **kept on disk** (not deleted) because the Supabase CLI references `supabase/seed.sql` for local-dev seeding. Do not delete it.

**Truncation note:** none of the files exceeded 500 lines, so no truncation was applied. The largest is `MIGRATION_BUNDLE.sql` at 448 lines.

---

### 2026-04-28 22:58:09 — `add_artist_fees.sql`

**Purpose:** Adds JSONB `artistas` column to `events` for storing artist names + cachês.

```sql
-- Migração para adicionar suporte a Artistas e Cachês no Evento
-- Se a coluna artistas não existir, cria como JSONB. Se existir, converte para JSONB.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'artistas') THEN
        ALTER TABLE events ADD COLUMN artistas JSONB DEFAULT '[]'::jsonb;
    ELSE
        ALTER TABLE events ALTER COLUMN artistas TYPE JSONB USING to_jsonb(artistas);
    END IF;
END $$;

COMMENT ON COLUMN events.artistas IS 'Lista de artistas e seus respectivos cachês no formato [{"name": "...", "fee": 0}]';
```

---

### 2026-04-28 22:58:09 — `add_benefit_quantity.sql`

**Purpose:** Adds `quantity` column to `event_benefits` for per-benefit ticket inventory.

```sql
-- Adiciona coluna de quantidade na tabela de benefícios de eventos
ALTER TABLE event_benefits ADD COLUMN quantity INTEGER DEFAULT 0;

COMMENT ON COLUMN event_benefits.quantity IS 'Quantidade de ingressos disponíveis para este benefício específico';
```

---

### 2026-04-28 22:58:09 — `add_employee_fields.sql`

**Purpose:** Adds `diaria` (daily rate) and `observacoes` to `employees`.

```sql
-- Adiciona campos de Diária e Observações ao cadastro de funcionários
ALTER TABLE employees ADD COLUMN diaria NUMERIC(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN observacoes TEXT;

COMMENT ON COLUMN employees.diaria IS 'Valor padrão da diária paga ao funcionário';
COMMENT ON COLUMN employees.observacoes IS 'Notas internas sobre o colaborador';
```

---

### 2026-04-28 22:58:09 — `add_employee_salary.sql`

**Purpose:** Adds `salario` and `eh_fixo` (fixed-salary flag) to `employees`.

```sql
-- Adiciona campo de Salário ao cadastro de funcionários e flag de funcionário fixo
ALTER TABLE employees ADD COLUMN salario NUMERIC(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN eh_fixo BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.salario IS 'Valor do salário mensal para funcionários fixos';
COMMENT ON COLUMN employees.eh_fixo IS 'Define se o funcionário é fixo (recebe salário) ou freelancer (recebe diária)';
```

---

### 2026-04-28 22:58:09 — `add_event_category.sql`

**Purpose:** Adds `category` text column to `events` (Theater/Show/Lecture/Workshop).

```sql
-- Adiciona campo de categoria ao evento para possibilitar filtragem por tipo
ALTER TABLE events ADD COLUMN category TEXT;

COMMENT ON COLUMN events.category IS 'Tipo do evento (Ex: Teatro, Show, Palestra, Workshop)';
```

---

### 2026-04-28 22:58:09 — `add_event_laughter.sql`

**Purpose:** Adds `laughter_level` integer to `events` for post-event comedy metrics.

```sql
-- Adiciona campo de risadas ao relatório final de eventos
ALTER TABLE events ADD COLUMN laughter_level INTEGER DEFAULT 0;

COMMENT ON COLUMN events.laughter_level IS 'Quantidade de risadas registrada ao fim do evento (para stand-up/comédia)';
```

---

### 2026-04-28 22:58:09 — `add_event_lifecycle.sql`

**Purpose:** Adds event lifecycle fields (`status`, `applause_level`, `closing_observations`, `finished_at`).

```sql
-- Adiciona campos para o ciclo de vida do evento e relatórios finais
ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'pendente';
ALTER TABLE events ADD COLUMN applause_level INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN closing_observations TEXT;
ALTER TABLE events ADD COLUMN finished_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN events.status IS 'Status do evento: pendente, iniciado, finalizado';
COMMENT ON COLUMN events.applause_level IS 'Quantidade de palmas registrada ao fim do evento';
COMMENT ON COLUMN events.closing_observations IS 'Observações finais do staff após o término';
```

---

### 2026-04-28 22:58:09 — `add_guest_list_templates.sql`

**Purpose:** Creates `guest_list_templates` and `guest_list_template_items` for reusable guest lists.

```sql
-- Tabela para armazenar templates de listas de convidados (listas pré-criadas)
CREATE TABLE guest_list_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theater_id UUID REFERENCES theaters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar os itens (convidados) de cada template
CREATE TABLE guest_list_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES guest_list_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    benefit_name TEXT, -- Nome do benefício (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE guest_list_templates IS 'Modelos de listas de convidados que podem ser reutilizados em múltiplos eventos';
```

---

### 2026-04-28 22:58:09 — `add_guest_no_show.sql`

**Purpose:** Adds `no_show` boolean to `guests`.

```sql
-- Adiciona coluna de "não compareceu" na tabela de convidados
ALTER TABLE guests ADD COLUMN no_show BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN guests.no_show IS 'Indica se o convidado foi marcado como ausente (não veio)';
```

---

### 2026-04-28 22:58:09 — `add_public_approval.sql`

**Purpose:** Adds `public_approval` integer (0-100) to `events`.

```sql
-- Adiciona coluna de aprovação pública no evento
ALTER TABLE events ADD COLUMN public_approval INTEGER CHECK (public_approval >= 0 AND public_approval <= 100);

COMMENT ON COLUMN events.public_approval IS 'Medida de satisfação do público de 0 a 100 (preenchido pós-evento)';
```

---

### 2026-04-28 22:58:09 — `cleanup.sql`

**Purpose:** Truncates operational tables while preserving users, profiles, and theaters.

```sql
-- Script para limpar TODOS os registros operacionais do banco de dados My Spot
-- Isso manterá os usuários, perfis (user_roles) e teatros (theaters) intactos para que o sistema continue funcionando.
-- Execute este script na aba "SQL Editor" do seu painel Supabase.

DO $$ 
DECLARE
    t text;
    tabelas text[] := ARRAY['audit_logs', 'financial_transactions', 'event_staff', 'event_benefits', 'tickets', 'guests', 'employees', 'events'];
BEGIN
    FOR i IN 1 .. array_length(tabelas, 1) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tabelas[i]) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tabelas[i]);
        END IF;
    END LOOP;
END $$;
```

---

### 2026-04-28 22:58:09 — `remove_theater_logic.sql`

**Purpose:** Drops NOT NULL on `user_roles.theater_id` to allow accounts without a theater.

```sql
-- Script SQL para remover a lógica de uma conta ter que estar relacionada a um teatro obrigatoriamente.

DO $$ 
BEGIN
    -- Remover a restrição NOT NULL da coluna theater_id na tabela user_roles
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'theater_id'
    ) THEN
        ALTER TABLE public.user_roles ALTER COLUMN theater_id DROP NOT NULL;
    END IF;

    -- Caso exista alguma Foreign Key que impeça a existência de uma conta sem teatro, 
    -- ela também poderia ser relaxada aqui, porém o DROP NOT NULL é o passo principal.
    
    -- Exemplo para dropar a constraint caso necessário:
    -- ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_theater_id_fkey;
END $$;
```

---

### 2026-04-29 13:49:38 — `add_together_qr_management.sql`

**Purpose:** Creates `together_tickets` for individual QR-coded invites with sold-count trigger.

```sql
-- =============================================================
-- GESTÃO DE INGRESSOS INDIVIDUAIS POR QR CODE (TOGETHER)
-- Este script adiciona o rastreamento individual de convites
-- para permitir a validação via QR Code na portaria.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.together_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    invitation_lot_id UUID REFERENCES extra_invitations(id) ON DELETE CASCADE,
    qr_code TEXT UNIQUE NOT NULL, -- Código único do convite
    buyer_name TEXT,
    buyer_cpf TEXT,
    used_at TIMESTAMPTZ, -- Se preenchido, o convite já entrou
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auditoria de quem validou
    validated_by UUID REFERENCES auth.users(id)
);

-- Index para busca ultra rápida na portaria
CREATE INDEX IF NOT EXISTS idx_together_tickets_qr ON together_tickets(qr_code);

-- RLS
ALTER TABLE together_tickets ENABLE ROW LEVEL SECURITY;

-- Política simples: Usuários autenticados que podem ver o evento podem ver os tickets
CREATE POLICY "Allow auth users to manage together tickets" 
ON together_tickets FOR ALL 
TO authenticated 
USING (true);

-- Gatilho para atualizar o contador de vendidos na tabela extra_invitations
CREATE OR REPLACE FUNCTION update_invitation_lot_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE extra_invitations 
        SET sold_count = sold_count + 1 
        WHERE id = NEW.invitation_lot_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE extra_invitations 
        SET sold_count = sold_count - 1 
        WHERE id = OLD.invitation_lot_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lot_count ON together_tickets;
CREATE TRIGGER trg_update_lot_count
AFTER INSERT OR DELETE ON together_tickets
FOR EACH ROW EXECUTE FUNCTION update_invitation_lot_count();
```

---

### 2026-04-29 13:49:38 — `graduation_schema.sql`

**Purpose:** Spotlight Graduation module — schema for high-end galas (graduation_details, staff, shifts, invitations, tables, attractions, buffet).

```sql
-- ==========================================
-- SPOTLIGHT GRADUATION MODULE SCHEMA
-- Management for High-End Galas and Graduations
-- ==========================================

-- 1. Graduation Events (Extension or dedicated table)
-- We'll use the existing 'events' but add graduation-specific fields or a child table
CREATE TABLE IF NOT EXISTS graduation_details (
    event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    class_name TEXT, -- Ex: "Medicina Turma 104"
    university TEXT,
    graduation_year INTEGER,
    theme TEXT, -- Tema da festa
    contract_value NUMERIC(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff Management (Reusing logic but with Graduation context)
CREATE TABLE IF NOT EXISTS graduation_staff_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL, -- 'SEGURANÇA', 'GARÇOM', 'RECEPCIONISTA', 'COORDENADOR'
    pix_key TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graduation_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    daily_rate NUMERIC(10,2) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'ABERTO' -- 'ABERTO', 'FECHADO'
);

-- 3. Extra Invitations (Convites Extras)
CREATE TABLE IF NOT EXISTS extra_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    graduate_name TEXT NOT NULL, -- Nome do formando
    price NUMERIC(10,2) NOT NULL,
    quantity_available INTEGER NOT NULL,
    sold_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table Allocation (Mesas)
CREATE TABLE IF NOT EXISTS table_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    graduate_name TEXT NOT NULL,
    max_seats INTEGER DEFAULT 10,
    occupied_seats INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(event_id, table_number)
);

-- 5. Attractions & Stage (Atrações e Palco)
CREATE TABLE IF NOT EXISTS attractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'BANDA', 'DJ', 'PERFORMANCE'
    performance_time TIME,
    duration_minutes INTEGER,
    technical_rider_url TEXT,
    fee NUMERIC(12,2),
    status TEXT DEFAULT 'CONFIRMADO'
);

-- 6. Food & Beverage (Buffet e Bar)
CREATE TABLE IF NOT EXISTS buffet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Ilha de Massas", "Ilha Japonesa"
    category TEXT, -- 'ILHA', 'PASSANTE', 'BEBIDA'
    status TEXT DEFAULT 'PLANEJADO', -- 'PLANEJADO', 'CONTRATADO', 'PRONTO'
    notes TEXT
);

-- Enable RLS
ALTER TABLE graduation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduation_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffet_items ENABLE ROW LEVEL SECURITY;
```

---

### 2026-04-29 13:49:38 — `user_access_logic.sql`

**Purpose:** Multi-module access control — `user_access` table + `check_module_access` trigger function for THEATER/TOGETHER/WORKERS.

```sql
-- =============================================================
-- GESTÃO DE ACESSO MULTI-MÓDULO (SPOTLIGHT UNIVERSE)
-- Este script implementa a validação de acesso baseada em 
-- assinatura/pagamento por módulo e remove a dependência de Slugs.
-- =============================================================

-- 1. Tabela de Acessos Autorizados
CREATE TABLE IF NOT EXISTS public.user_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL, -- 'THEATER', 'TOGETHER', 'WORKERS'
    entity_id UUID, -- theater_id, graduation_event_id, etc.
    is_paid BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_type, entity_id)
);

-- 2. Trigger para validar acesso antes de operações (Exemplo para Theaters)
CREATE OR REPLACE FUNCTION check_module_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o usuário tem uma entrada de pagamento ativa para o módulo
    IF NOT EXISTS (
        SELECT 1 FROM user_access 
        WHERE user_id = auth.uid() 
        AND module_type = TG_ARGV[0] 
        AND is_paid = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Assinatura do módulo % não encontrada ou expirada.', TG_ARGV[0];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de aplicação:
-- CREATE TRIGGER trg_validate_theater_access 
-- BEFORE INSERT OR UPDATE ON events
-- FOR EACH ROW EXECUTE FUNCTION check_module_access('THEATER');

-- 3. Função Helper para o Frontend resolver a Entidade do Usuário
CREATE OR REPLACE FUNCTION get_user_entities()
RETURNS TABLE (module TEXT, entity_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT module_type, ua.entity_id 
    FROM user_access ua
    WHERE ua.user_id = auth.uid() 
    AND ua.is_paid = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2026-05-02 14:22:05 — `MASTER_MIGRATION_V2.sql`

**Purpose:** Master schema fix — adds user_id/theater_id columns, creates theaters/team_members, restores RLS policies, indexes.

```sql
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
```

---

### 2026-05-02 14:22:05 — `REFATORACAO_COMPLETA.sql`

**Purpose:** Spotlight v3 refactor — user_profiles + handle_new_user trigger, expanded events/employees columns, full RLS policies with team sharing.

```sql
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
```

---

### 2026-05-02 14:22:05 — `fix_employees_columns.sql`

**Purpose:** Ensures `is_contracted` and `salary` exist on `employees` and back-syncs from legacy `eh_fixo`.

```sql
-- ============================================================
-- Migration: Correção de nomes de colunas na tabela employees
-- Objetivo: Garantir que 'is_contracted' exista para compatibilidade com o Dashboard
-- ============================================================

-- 1. Adicionar colunas se não existirem
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_contracted BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0;

-- 2. Sincronizar dados de 'eh_fixo' para 'is_contracted' caso eh_fixo já exista e tenha dados
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='eh_fixo') THEN
        UPDATE employees SET is_contracted = eh_fixo WHERE is_contracted IS NULL OR is_contracted = false;
    END IF;
END $$;
```

---

### 2026-05-02 14:22:05 — `fix_missing_rls_sharing.sql`

**Purpose:** Relaxes legacy NOT NULL on guests.theater_id/theaters.slug; updates RLS policies on theaters/event_staff/event_benefits/user_profiles to support team sharing.

```sql
-- Fix RLS for various tables to support team sharing (Multi-tenant context)
-- and fix legacy schema constraints in the guests and theaters tables.

-- 1. Fix Legacy Constraints
DO $$ 
BEGIN 
    -- Guests: theater_id should be optional (we use event_id now)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guests' AND column_name='theater_id') THEN
        ALTER TABLE public.guests ALTER COLUMN theater_id DROP NOT NULL;
    END IF;

    -- Theaters: slug should be optional (legacy routing logic)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='theaters' AND column_name='slug') THEN
        ALTER TABLE public.theaters ALTER COLUMN slug DROP NOT NULL;
    END IF;
END $$;

-- 2. Fix RLS for theaters (Localidades)
DROP POLICY IF EXISTS "Users can manage their own locations" ON theaters;
DROP POLICY IF EXISTS "Users and team manage locations" ON theaters;
CREATE POLICY "Users and team manage locations"
  ON theaters FOR ALL
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = theaters.user_id 
      AND team_members.member_id = auth.uid()
    )
  );

-- 3. Fix RLS for event_staff
DROP POLICY IF EXISTS "Users can manage staff for their own events" ON event_staff;
DROP POLICY IF EXISTS "Users and team manage event staff" ON event_staff;
CREATE POLICY "Users and team manage event staff"
  ON event_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_staff.event_id
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

-- 4. Fix RLS for event_benefits
DROP POLICY IF EXISTS "Users can manage benefits for their own events" ON event_benefits;
DROP POLICY IF EXISTS "Users and team manage event benefits" ON event_benefits;
CREATE POLICY "Users and team manage event benefits"
  ON event_benefits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_benefits.event_id
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

-- 5. Fix RLS for user_profiles
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users and team see profile" ON user_profiles;
CREATE POLICY "Users and team see profile"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.owner_id = user_profiles.id 
      AND team_members.member_id = auth.uid()
    )
  );
```

---

### 2026-05-02 14:22:05 — `make_theater_id_optional.sql`

**Purpose:** Drops NOT NULL on theater_id in employees/events; ensures theaters table exists with RLS.

```sql
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
```

---

### 2026-05-02 14:22:05 — `migrate_user_id_and_location.sql`

**Purpose:** Adds user_id/location to events and user_id to employees; creates per-user RLS policies for both tables.

```sql
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
```

---

### 2026-05-02 14:22:05 — `new_unified_schema.sql`

**Purpose:** Unified schema (no slugs) — profiles, events, employees, event_staff, event_benefits, guests, additional_expenses, audit_logs all keyed to auth.users with RLS.

```sql
-- =============================================================
-- MY SPOT - UNIFIED SCHEMA (NO SLUGS)
-- This schema associates all data directly with the authenticated User.
-- =============================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles (Optional, but good for names/usernames)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Events (Associated with User)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'Peça', 'Show', 'Corporativo', etc.
    event_date DATE NOT NULL,
    event_time TIME,
    capacity INTEGER DEFAULT 0,
    ticket_price NUMERIC(10,2) DEFAULT 0,
    tecnico_som TEXT,
    tecnico_iluminacao TEXT,
    produtor TEXT,
    artistas JSONB, -- Array of {name, fee}
    custom_fields JSONB, -- Array of {label, value}
    extra_expenses JSONB, -- Array of {description, value}
    additional_details TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'iniciado', 'finalizado'
    finished_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Employees (Associated with User)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    telefone TEXT,
    endereco TEXT,
    cargo TEXT,
    departamento TEXT,
    pix TEXT,
    diaria NUMERIC(10,2) DEFAULT 0,
    salary NUMERIC(10,2) DEFAULT 0,
    eh_fixo BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'ativo', -- 'ativo', 'inativo', 'ferias'
    observacoes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Event Staff (Link between Events and Employees)
CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    tem_diaria BOOLEAN DEFAULT true,
    valor_diaria NUMERIC(10,2),
    horario_chegada TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, employee_id)
);

-- 6. Event Benefits (Ticket types)
CREATE TABLE IF NOT EXISTS public.event_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Guests (Associated with Event)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    benefit_id UUID REFERENCES public.event_benefits(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    checked_in BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Additional Expenses (Financial)
CREATE TABLE IF NOT EXISTS public.additional_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID, -- Now strictly UUID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS) - Data Isolation
-- =============================================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.additional_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Events
CREATE POLICY "Users can only see their own events" ON public.events
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Employees
CREATE POLICY "Users can only see their own employees" ON public.employees
    FOR ALL USING (auth.uid() = user_id);

-- Policies for Event Staff (Indirect access via Event)
CREATE POLICY "Users can manage staff for their own events" ON public.event_staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = event_staff.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policies for Event Benefits
CREATE POLICY "Users can manage benefits for their own events" ON public.event_benefits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = event_benefits.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policies for Guests
CREATE POLICY "Users can manage guests for their own events" ON public.guests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = guests.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policies for Additional Expenses
CREATE POLICY "Users can manage expenses for their own events" ON public.additional_expenses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events 
            WHERE events.id = additional_expenses.event_id 
            AND events.user_id = auth.uid()
        )
    );

-- Policies for Audit Logs
CREATE POLICY "Users can see their own audit logs" ON public.audit_logs
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================
-- Migration steps for existing data (Conceptual)
-- =============================================================
-- 1. Add user_id column to existing tables if not present
-- 2. Map existing theater_id -> user_id based on user_roles
-- 3. DROP old slug-based logic and theater tables if desired
```

---

### 2026-05-02 14:22:05 — `team_sharing_migration.sql`

**Purpose:** Creates `team_members` table; rewrites RLS on events/employees/guests/audit_logs to allow access via team membership.

```sql
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
```

---

### 2026-05-04 15:04:28 — `FINAL_SYNC_MIGRATION.sql`

**Purpose:** Adds `details` and `theater_id` columns to events; ensures theater address/financial fields; updates RLS for locations.

```sql
-- FINAL SYNC: Sincronização final do schema com as mudanças de UI
-- 1. Unificar campo de detalhes e adicionar theater_id em eventos
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS theater_id UUID REFERENCES public.theaters(id) ON DELETE SET NULL;

-- 2. Garantir que theaters tenha os campos de endereço e financeiros
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10,2) DEFAULT 0;

-- 3. Migração de dados (Pulada pois additional_details não existe)

-- 4. Criar índice para performance em buscas por local
CREATE INDEX IF NOT EXISTS idx_events_theater_id ON public.events(theater_id);

-- 5. Atualizar RLS para Locais (garantir que donos e membros vejam)
DROP POLICY IF EXISTS "Users can manage their own locations" ON public.theaters;
CREATE POLICY "Users and team can manage locations" ON public.theaters 
FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.team_members WHERE owner_id = theaters.user_id AND member_id = auth.uid())
);
```

---

### 2026-05-04 15:04:28 — `MIGRATION_BUNDLE.sql`

**Purpose:** Unified, idempotent migration bundle reconciling profiles/audit_logs schema duplication, ticket_orders.status CHECK relaxation, guests↔ticket_orders link, organization_settings, fiscal_invoices, super_admins.

```sql
-- =============================================================
-- SPOTLIGHT — UNIFIED MIGRATION BUNDLE
-- Idempotente. Pode ser rodado em banco vazio OU parcialmente migrado.
-- Data: 2026-05-04
--
-- Reconcilia conflitos das migrações antigas:
--   - profiles tem schema duplo (com/sem user_type) → consolidamos
--   - audit_logs tem schema duplo (target_table vs entity_type) → adicionamos os dois conjuntos de colunas
--   - ticket_orders.status CHECK não permitia 'checked_in' → relaxamos
--   - guests não conhecia ticket_orders → ligamos via order_id + qr_code
-- =============================================================

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. PROFILES — base
-- =============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Colunas que podem estar faltando dependendo de qual migração antiga rodou.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Garante CHECK em user_type sem duplicar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_type_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('admin', 'customer'));
  END IF;
END$$;

-- Stripe Connect (do add_stripe_connect_to_profiles.sql)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Controle de plano e acesso (do admin_view_setup.sql)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_disabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'essencial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_tier_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_tier_check CHECK (plan_tier IN ('essencial', 'profissional', 'enterprise'));
  END IF;
END$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_user_type           ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at          ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id   ON public.profiles(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_access_disabled     ON public.profiles(access_disabled);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier           ON public.profiles(plan_tier);

DROP POLICY IF EXISTS "Users can view their own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage profiles"   ON public.profiles;

CREATE POLICY "Users can view their own profile"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Service role can manage profiles"   ON public.profiles FOR ALL    TO service_role  USING (true) WITH CHECK (true);

-- Trigger: cria profile automaticamente após signup em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, full_name, phone_number, organization_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'organization_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    organization_name = EXCLUDED.organization_name,
    user_type = EXCLUDED.user_type;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 2. EVENTS + EMPLOYEES + EVENT_STAFF + EVENT_BENEFITS + GUESTS + ADDITIONAL_EXPENSES
-- =============================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    capacity INTEGER DEFAULT 0,
    ticket_price NUMERIC(10,2) DEFAULT 0,
    tecnico_som TEXT,
    tecnico_iluminacao TEXT,
    produtor TEXT,
    artistas JSONB,
    custom_fields JSONB,
    extra_expenses JSONB,
    additional_details TEXT,
    status TEXT DEFAULT 'pendente',
    finished_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS house_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;

CREATE INDEX IF NOT EXISTS idx_events_house_id ON public.events(house_id);
CREATE INDEX IF NOT EXISTS idx_events_slug      ON public.events(slug) WHERE slug IS NOT NULL;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only see their own events" ON public.events;
CREATE POLICY "Users can only see their own events" ON public.events FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf TEXT,
    telefone TEXT,
    endereco TEXT,
    cargo TEXT,
    departamento TEXT,
    pix TEXT,
    diaria NUMERIC(10,2) DEFAULT 0,
    salary NUMERIC(10,2) DEFAULT 0,
    eh_fixo BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'ativo',
    observacoes TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only see their own employees" ON public.employees;
CREATE POLICY "Users can only see their own employees" ON public.employees FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    tem_diaria BOOLEAN DEFAULT true,
    valor_diaria NUMERIC(10,2),
    horario_chegada TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, employee_id)
);
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage staff for their own events" ON public.event_staff;
CREATE POLICY "Users can manage staff for their own events" ON public.event_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_staff.event_id AND events.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.event_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.event_benefits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage benefits for their own events" ON public.event_benefits;
CREATE POLICY "Users can manage benefits for their own events" ON public.event_benefits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = event_benefits.event_id AND events.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    benefit_id UUID REFERENCES public.event_benefits(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    checked_in BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage guests for their own events" ON public.guests;
CREATE POLICY "Users can manage guests for their own events" ON public.guests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = guests.event_id AND events.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.additional_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.additional_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage expenses for their own events" ON public.additional_expenses;
CREATE POLICY "Users can manage expenses for their own events" ON public.additional_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = additional_expenses.event_id AND events.user_id = auth.uid())
  );

-- =============================================================
-- 3. AUDIT LOGS — schema unificado (suporta tanto target_table/target_id quanto entity_type/entity_id)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona ambos os conjuntos de colunas — código antigo usa target_*, novo usa entity_*.
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS username      TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_table  TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_id     UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type   TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id     UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS before_value  JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS after_value   JSONB;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs"         ON public.audit_logs;

CREATE POLICY "Users can see their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view audit logs"         ON public.audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id  ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =============================================================
-- 4. TICKET_ORDERS — Stripe Checkout
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ticket_orders (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id              UUID REFERENCES public.events NOT NULL,
  benefit_id            UUID REFERENCES public.event_benefits,
  buyer_name            TEXT NOT NULL,
  buyer_email           TEXT NOT NULL,
  buyer_cpf             TEXT,
  buyer_phone           TEXT,
  quantity              INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price            NUMERIC(10,2) NOT NULL,
  total_amount          NUMERIC(10,2) NOT NULL,
  platform_fee          NUMERIC(10,2) NOT NULL,
  net_to_producer       NUMERIC(10,2) NOT NULL,
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  status                TEXT DEFAULT 'pending',
  qr_code               TEXT UNIQUE,
  ticket_code           TEXT UNIQUE,
  email_sent            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  paid_at               TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ
);

-- Colunas usadas pelo /api/tickets/validate
ALTER TABLE public.ticket_orders ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
ALTER TABLE public.ticket_orders ADD COLUMN IF NOT EXISTS staff_id      UUID;

-- Reconcilia o CHECK do status — relaxa para incluir 'checked_in'.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_orders_status_check') THEN
    ALTER TABLE public.ticket_orders DROP CONSTRAINT ticket_orders_status_check;
  END IF;
  ALTER TABLE public.ticket_orders
    ADD CONSTRAINT ticket_orders_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'checked_in'));
END$$;

ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ticket_orders_owner_read"     ON public.ticket_orders;
DROP POLICY IF EXISTS "ticket_orders_service_insert" ON public.ticket_orders;
DROP POLICY IF EXISTS "ticket_orders_service_update" ON public.ticket_orders;

CREATE POLICY "ticket_orders_owner_read" ON public.ticket_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = ticket_orders.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "ticket_orders_service_insert" ON public.ticket_orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "ticket_orders_service_update" ON public.ticket_orders FOR UPDATE USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_ticket_orders_event   ON public.ticket_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_status  ON public.ticket_orders(status);

-- =============================================================
-- 5. GUESTS ↔ TICKET_ORDERS — link para que scanner conte vendas online
-- =============================================================
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS qr_code        TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS order_id       UUID REFERENCES public.ticket_orders(id) ON DELETE SET NULL;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_qr_code  ON public.guests(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_guests_order_id ON public.guests(order_id);

-- Backfill: pedidos pagos sem guest associado ganham linha.
INSERT INTO public.guests (event_id, benefit_id, name, quantity, checked_in, qr_code, order_id, created_at)
SELECT o.event_id, o.benefit_id, o.buyer_name, o.quantity,
       (o.status = 'checked_in'), o.qr_code, o.id, o.created_at
FROM public.ticket_orders o
LEFT JOIN public.guests g ON g.order_id = o.id
WHERE o.status IN ('paid', 'checked_in')
  AND g.id IS NULL
  AND o.qr_code IS NOT NULL;

-- =============================================================
-- 6. ORGANIZATION_SETTINGS + FISCAL_INVOICES (white-label e fiscal)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  org_name TEXT, logo_url TEXT, primary_color TEXT DEFAULT '#e11d48',
  cnpj TEXT, ie TEXT, im TEXT,
  address TEXT, city TEXT, state TEXT, cep TEXT,
  phone TEXT, website TEXT, pix_key TEXT, bank_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_settings_owner" ON public.organization_settings;
CREATE POLICY "org_settings_owner" ON public.organization_settings FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_org_settings_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_settings_updated ON public.organization_settings;
CREATE TRIGGER trg_org_settings_updated BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_org_settings_timestamp();

CREATE INDEX IF NOT EXISTS idx_org_settings_user ON public.organization_settings(user_id);

CREATE TABLE IF NOT EXISTS public.fiscal_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  event_id UUID REFERENCES public.events,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type TEXT DEFAULT 'RECIBO' CHECK (invoice_type IN ('RECIBO', 'NFSE')),
  issuer_name TEXT NOT NULL, issuer_cnpj TEXT NOT NULL,
  issuer_address TEXT, issuer_city TEXT, issuer_state TEXT, issuer_im TEXT,
  taker_name TEXT NOT NULL, taker_cnpj_cpf TEXT NOT NULL,
  taker_address TEXT, taker_city TEXT, taker_email TEXT,
  service_code TEXT DEFAULT '1.01', service_desc TEXT NOT NULL,
  service_value NUMERIC(10,2) NOT NULL, deductions NUMERIC(10,2) DEFAULT 0,
  net_value NUMERIC(10,2),
  iss_rate NUMERIC(5,4) DEFAULT 0.05, iss_value NUMERIC(10,2),
  ir_value NUMERIC(10,2) DEFAULT 0, csll_value NUMERIC(10,2) DEFAULT 0,
  pis_value NUMERIC(10,2) DEFAULT 0, cofins_value NUMERIC(10,2) DEFAULT 0,
  nfse_number TEXT, nfse_xml TEXT, nfse_pdf_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  issued_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fiscal_invoices_owner" ON public.fiscal_invoices;
CREATE POLICY "fiscal_invoices_owner" ON public.fiscal_invoices FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_user  ON public.fiscal_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_event ON public.fiscal_invoices(event_id);

-- =============================================================
-- 7. SUPER_ADMINS — login isolado de auth.users para /admin/view
-- =============================================================
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role full access super_admins" ON public.super_admins;
CREATE POLICY "service_role full access super_admins"
    ON public.super_admins FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.super_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);
ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role full access super_admin_sessions" ON public.super_admin_sessions;
CREATE POLICY "service_role full access super_admin_sessions"
    ON public.super_admin_sessions FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_token   ON public.super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON public.super_admin_sessions(expires_at);

-- Bootstrap: hash scrypt para a senha l4pisde0lho@44.
INSERT INTO public.super_admins (email, password_hash)
VALUES (
    'altmarinscript@gmail.com',
    '2a62dd67ebf5f5b892a80b0ef1cbd8d3:c3eb9380355391223e4e72d6bfff8d10a69bc129e5d03b4b63bd052a981c9861e3a3963f88ca1ea38c31b56d24d558d022bd63c3bdd73213191d741cd9a2dc07'
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- VERIFICAÇÃO
-- =============================================================
-- Cole no SQL editor depois de rodar para confirmar:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('events','event_benefits','guests','profiles',
--                        'ticket_orders','audit_logs','super_admins',
--                        'super_admin_sessions','organization_settings','fiscal_invoices');
--   SELECT email FROM public.super_admins;
```

---

### 2026-05-04 15:04:28 — `add_attendance_to_benefits.sql`

**Purpose:** Adds `attendance_count` column to `event_benefits` for per-ticket-type attendance tracking.

```sql
-- Adiciona coluna de contagem de presença por tipo de ingresso
ALTER TABLE event_benefits ADD COLUMN IF NOT EXISTS attendance_count INTEGER DEFAULT 0;
```

---

### 2026-05-04 15:04:28 — `add_is_public_to_events.sql`

**Purpose:** Adds `is_public` and `thumbnail_url` to events; creates RLS policy allowing anonymous read of public events.

```sql
-- Adiciona colunas para controle de visibilidade pública e thumbnail nos eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Atualiza as políticas de RLS para permitir que qualquer pessoa (anon/autenticado) veja eventos públicos
-- Primeiro removemos políticas conflitantes se existirem (opcional, mas seguro)
-- DROP POLICY IF EXISTS "Anyone can view public events" ON public.events;

CREATE POLICY "Anyone can view public events" ON public.events
    FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);
```

---

### 2026-05-04 15:04:28 — `add_stripe_connect_to_profiles.sql`

**Purpose:** Adds Stripe Connect fields (account_id, connected_at, charges_enabled, payouts_enabled) to profiles.

```sql
-- Add Stripe Connect fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Index para buscar rápido
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id ON profiles(stripe_account_id);

-- Comentário para documentação
COMMENT ON COLUMN profiles.stripe_account_id IS 'Stripe Connected Account ID (acct_...)';
COMMENT ON COLUMN profiles.stripe_connected_at IS 'Timestamp quando a conta Stripe foi conectada';
COMMENT ON COLUMN profiles.stripe_charges_enabled IS 'Se a conta pode receber charges';
COMMENT ON COLUMN profiles.stripe_payouts_enabled IS 'Se a conta pode receber payouts';
```

---

### 2026-05-04 15:04:28 — `admin_view_setup.sql`

**Purpose:** Creates super_admins/super_admin_sessions tables for /admin/view custom login (scrypt-hashed); adds plan_tier/access_disabled to profiles.

```sql
-- =============================================================
-- ADMIN /view SUPER-ADMIN SETUP
-- =============================================================
-- Cria tabela super_admins (login customizado isolado de auth.users)
-- + colunas de controle de plano e acesso em profiles.
--
-- Senha armazenada como scrypt(salt:hash) — nunca plaintext.
-- Bootstrap email: altmarinscript@gmail.com
-- =============================================================

-- 1. Tabela super_admins -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,           -- formato: "salt_hex:hash_hex" (scrypt)
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode tocar nesta tabela. authenticated/anon: zero acesso.
DROP POLICY IF EXISTS "service_role full access super_admins" ON public.super_admins;
CREATE POLICY "service_role full access super_admins"
    ON public.super_admins FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- 2. Tabela de sessões super-admin (HMAC stateless seria ok, mas com tabela
--    podemos revogar e auditar logins).
CREATE TABLE IF NOT EXISTS public.super_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,       -- sha256 do token enviado no cookie
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access super_admin_sessions" ON public.super_admin_sessions;
CREATE POLICY "service_role full access super_admin_sessions"
    ON public.super_admin_sessions FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_token ON public.super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON public.super_admin_sessions(expires_at);

-- 3. Bootstrap do super-admin (idempotente) ----------------------------------
-- Hash gerado com node crypto.scryptSync(password, salt, 64).
INSERT INTO public.super_admins (email, password_hash)
VALUES (
    'altmarinscript@gmail.com',
    '2a62dd67ebf5f5b892a80b0ef1cbd8d3:c3eb9380355391223e4e72d6bfff8d10a69bc129e5d03b4b63bd052a981c9861e3a3963f88ca1ea38c31b56d24d558d022bd63c3bdd73213191d741cd9a2dc07'
)
ON CONFLICT (email) DO NOTHING;

-- 4. Controle de organizadores em profiles -----------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS access_disabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'essencial'
    CHECK (plan_tier IN ('essencial', 'profissional', 'enterprise'));

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_access_disabled ON public.profiles(access_disabled);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON public.profiles(plan_tier);

-- 5. Política de leitura agregada para o super-admin -------------------------
-- Não criamos uma policy de leitura "para super-admin" em profiles porque o
-- /admin/view sempre acessa via service_role no servidor. Isso mantém a
-- proteção máxima: nenhum cliente browser jamais consegue listar profiles.

-- =============================================================
-- VERIFICAÇÃO
-- =============================================================
-- SELECT email, created_at FROM public.super_admins;
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('access_disabled','plan_tier');
```

---

### 2026-05-04 15:04:28 — `create_profiles_and_auth.sql`

**Purpose:** Creates profiles table with user_type CHECK ('admin'/'customer'), handle_new_user trigger, audit_logs table with admin-only RLS.

```sql
-- =============================================================
-- CREATE PROFILES TABLE + USER TYPE DIFFERENTIATION
-- =============================================================

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'customer')),
    full_name TEXT,
    cpf TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver/editar seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- RLS: Service role pode fazer tudo (para criar perfil no webhook)
CREATE POLICY "Service role can manage profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- Índices
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Função para registrar quando um novo usuário é criado via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente após signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ADICIONAR CAMPOS FALTANTES A EVENTOS E INGRESSOS
-- =============================================================

-- Adicionar coluna house_id aos eventos (para suportar múltiplas casas)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS house_id UUID;

-- Índice para busca rápida por casa
CREATE INDEX IF NOT EXISTS idx_events_house_id ON events(house_id);

-- =============================================================
-- AUDIT LOGS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Função para logging automático
CREATE OR REPLACE FUNCTION public.log_audit_entry(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_before_value JSONB DEFAULT NULL,
    p_after_value JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_value, after_value)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before_value, p_after_value);
END;
$$ LANGUAGE plpgsql;
```

---

### 2026-05-04 15:04:28 — `create_support_and_final_tables.sql`

**Purpose:** Creates support_tickets, houses, staff tables; adds events.house_id; rewrites RLS for events/ticket_orders; creates audit trigger function and sales/staff statistics views.

```sql
-- =============================================================
-- SUPPORT TICKETS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES ticket_orders(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage all tickets"
ON support_tickets FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

CREATE INDEX idx_support_tickets_email ON support_tickets(email);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- =============================================================
-- HOUSES TABLE (Para suportar múltiplas casas de show por admin)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    capacity INTEGER DEFAULT 100,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their houses"
ON houses FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their houses"
ON houses FOR ALL
TO authenticated
USING (owner_id = auth.uid());

CREATE INDEX idx_houses_owner_id ON houses(owner_id);

-- =============================================================
-- STAFF TABLE (Funcionários por casa)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    salary DECIMAL(10, 2),
    hourly_rate BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff of their houses"
ON staff FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM houses
        WHERE houses.id = staff.house_id
        AND houses.owner_id = auth.uid()
    )
);

CREATE INDEX idx_staff_house_id ON staff(house_id);
CREATE INDEX idx_staff_user_id ON staff(user_id);

-- =============================================================
-- ATUALIZAR TABELA EVENTS PARA SUPORTAR HOUSE
-- =============================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_events_house_id ON events(house_id);

-- =============================================================
-- RLS UPDATE - EVENTS
-- =============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Admins podem ver apenas seus eventos
CREATE POLICY "Admins can view their events" ON events FOR SELECT
TO authenticated USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM houses
        WHERE houses.id = events.house_id AND houses.owner_id = auth.uid()
    )
);

-- Clientes podem ver eventos públicos
CREATE POLICY "Customers can view public events" ON events FOR SELECT
TO authenticated USING (is_public = true);

-- Admins podem gerenciar seus eventos
CREATE POLICY "Admins can manage their events" ON events FOR ALL
TO authenticated USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM houses
        WHERE houses.id = events.house_id AND houses.owner_id = auth.uid()
    )
);

-- =============================================================
-- RLS UPDATE - TICKET_ORDERS
-- =============================================================

ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orders" ON ticket_orders FOR SELECT
TO authenticated USING (
    buyer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can view event orders" ON ticket_orders FOR SELECT
TO authenticated USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = ticket_orders.event_id
        AND (events.owner_id = auth.uid() OR
             EXISTS (SELECT 1 FROM houses WHERE houses.id = events.house_id AND houses.owner_id = auth.uid()))
    )
);

-- =============================================================
-- AUDIT LOGS - ÍNDICES E MELHORIAS
-- =============================================================

-- Função melhorada de logging
CREATE OR REPLACE FUNCTION public.trigger_update_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_value, after_value)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        row_to_json(OLD),
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- ESTATÍSTICAS E VIEWS (OPCIONAL)
-- =============================================================

-- View para resumo de vendas por evento
CREATE OR REPLACE VIEW event_sales_summary AS
SELECT
    e.id,
    e.title,
    e.event_date,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.quantity) as total_tickets_sold,
    SUM(CASE WHEN o.status = 'paid' THEN o.total_amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN o.status = 'paid' THEN o.platform_fee ELSE 0 END) as platform_fees,
    COUNT(DISTINCT CASE WHEN o.status = 'checked_in' THEN o.id END) as checked_in_count
FROM events e
LEFT JOIN ticket_orders o ON e.id = o.event_id
GROUP BY e.id, e.title, e.event_date;

-- View para estatísticas de staff
CREATE OR REPLACE VIEW staff_statistics AS
SELECT
    s.id,
    s.name,
    s.role,
    h.name as house_name,
    COUNT(DISTINCT CASE WHEN a.action = 'check_in' THEN a.id END) as total_checkins,
    COUNT(DISTINCT a.id) as total_actions
FROM staff s
LEFT JOIN houses h ON s.house_id = h.id
LEFT JOIN audit_logs a ON a.user_id = s.user_id
GROUP BY s.id, s.name, s.role, h.name;
```

---

### 2026-05-04 15:04:28 — `features_monetization.sql`

**Purpose:** Creates monetization tables — organization_settings (white-label), ticket_orders (Stripe), fiscal_invoices (RECIBO/NFSE) with sequential numbering function.

```sql
-- ============================================================
-- MONETIZATION FEATURES: White-label, Ticket Sales, Fiscal
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FEATURE 3: Organization Settings (White-label)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_settings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL UNIQUE,
  org_name        TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#e11d48',
  cnpj            TEXT,
  ie              TEXT,         -- Inscrição Estadual
  im              TEXT,         -- Inscrição Municipal
  address         TEXT,
  city            TEXT,
  state           TEXT,
  cep             TEXT,
  phone           TEXT,
  website         TEXT,
  pix_key         TEXT,
  bank_info       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_settings_owner" ON organization_settings
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_org_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_settings_updated
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION update_org_settings_timestamp();


-- ────────────────────────────────────────────────────────────
-- FEATURE 4: Online Ticket Orders (Stripe)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_orders (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id              UUID REFERENCES events NOT NULL,
  benefit_id            UUID REFERENCES event_benefits,
  buyer_name            TEXT NOT NULL,
  buyer_email           TEXT NOT NULL,
  buyer_cpf             TEXT,
  buyer_phone           TEXT,
  quantity              INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price            NUMERIC(10,2) NOT NULL,
  total_amount          NUMERIC(10,2) NOT NULL,        -- quantity × unit_price
  platform_fee          NUMERIC(10,2) NOT NULL,        -- 3% of total_amount
  net_to_producer       NUMERIC(10,2) NOT NULL,        -- total_amount - platform_fee
  stripe_session_id     TEXT UNIQUE,
  stripe_payment_intent TEXT,
  status                TEXT DEFAULT 'pending'         -- pending | paid | cancelled | refunded
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  qr_code               TEXT UNIQUE,                  -- UUID used as QR payload
  ticket_code           TEXT UNIQUE,                  -- human-readable, e.g. SPT-2026-XXXXX
  email_sent            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  paid_at               TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ
);

ALTER TABLE ticket_orders ENABLE ROW LEVEL SECURITY;

-- Event owner can see all orders for their events
CREATE POLICY "ticket_orders_owner_read" ON ticket_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_orders.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Allow public insert (used server-side via service_role key)
CREATE POLICY "ticket_orders_service_insert" ON ticket_orders
  FOR INSERT WITH CHECK (TRUE);

-- Update allowed server-side via service_role
CREATE POLICY "ticket_orders_service_update" ON ticket_orders
  FOR UPDATE USING (TRUE);

-- Add slug field to events for public URLs
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sale_starts_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

-- Index for public event lookup by slug
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_orders_event ON ticket_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_orders_status ON ticket_orders(status);


-- ────────────────────────────────────────────────────────────
-- FEATURE 5: Fiscal Invoices (Recibos / NFS-e)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_invoices (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users NOT NULL,
  event_id          UUID REFERENCES events,
  invoice_number    TEXT UNIQUE NOT NULL,              -- SPT-2026-00001 (sequential)
  invoice_type      TEXT DEFAULT 'RECIBO'              -- RECIBO | NFSE
    CHECK (invoice_type IN ('RECIBO', 'NFSE')),

  -- Emitente (prestador = organização do usuário)
  issuer_name       TEXT NOT NULL,
  issuer_cnpj       TEXT NOT NULL,
  issuer_address    TEXT,
  issuer_city       TEXT,
  issuer_state      TEXT,
  issuer_im         TEXT,                              -- Inscrição Municipal (for NFS-e)

  -- Tomador (quem contratou o serviço)
  taker_name        TEXT NOT NULL,
  taker_cnpj_cpf    TEXT NOT NULL,
  taker_address     TEXT,
  taker_city        TEXT,
  taker_email       TEXT,

  -- Serviço
  service_code      TEXT DEFAULT '1.01',              -- LC 116 service code
  service_desc      TEXT NOT NULL,
  service_value     NUMERIC(10,2) NOT NULL,
  deductions        NUMERIC(10,2) DEFAULT 0,
  net_value         NUMERIC(10,2),                    -- service_value - deductions

  -- Impostos
  iss_rate          NUMERIC(5,4) DEFAULT 0.05,        -- 5% padrão
  iss_value         NUMERIC(10,2),
  ir_value          NUMERIC(10,2) DEFAULT 0,
  csll_value        NUMERIC(10,2) DEFAULT 0,
  pis_value         NUMERIC(10,2) DEFAULT 0,
  cofins_value      NUMERIC(10,2) DEFAULT 0,

  -- NFS-e (preenchido quando emitido via API)
  nfse_number       TEXT,
  nfse_xml           TEXT,
  nfse_pdf_url      TEXT,

  -- Status
  status            TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'cancelled')),
  issued_at         TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  observations      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fiscal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_invoices_owner" ON fiscal_invoices
  FOR ALL USING (auth.uid() = user_id);

-- Sequential invoice number function
CREATE OR REPLACE FUNCTION generate_invoice_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  seq INT;
  yr TEXT;
BEGIN
  yr := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq
  FROM fiscal_invoices
  WHERE user_id = p_user_id
    AND TO_CHAR(created_at, 'YYYY') = yr;
  RETURN 'SPT-' || yr || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_user ON fiscal_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_invoices_event ON fiscal_invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_org_settings_user ON organization_settings(user_id);
```

---

### 2026-05-04 15:04:28 — `fix_events_details_column.sql`

**Purpose:** Renames `events.additional_details` to `details` (or adds `details` if neither exists).

```sql
-- Ajusta coluna de detalhes do evento para bater com o código (renomeia se necessário)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'additional_details') THEN
    ALTER TABLE public.events RENAME COLUMN additional_details TO details;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'details') THEN
    ALTER TABLE public.events ADD COLUMN details TEXT;
  END IF;
END $$;
```

---

### 2026-05-04 15:04:28 — `fix_ticketing_checkin.sql`

**Purpose:** Unifies Stripe order check-in with QR scanner — relaxes ticket_orders status CHECK to allow 'checked_in', adds qr_code/order_id to guests, backfills missing guests.

```sql
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
```

---

### 2026-05-04 20:06:29 — `MIGRATION_AUDIT_LOGS_FIX.sql`

**Purpose:** Restores INSERT/SELECT policies on audit_logs that the harden pass had stripped, blocking all client-side audit writes.

```sql
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
```

---

### 2026-05-04 20:06:29 — `MIGRATION_HARDEN_RLS.sql`

**Purpose:** Comprehensive RLS hardening pass — locks ticket_orders to read-only-via-service_role, wraps all auth.uid() in subselects for performance, adds anon read for public events, missing FK indexes, REVOKE on handle_new_user.

```sql
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
```

---

## Seed data (kept on disk)

### 2026-04-28 22:58:09 — `seed.sql`

**Important:** This file is **NOT deleted** — it remains at `supabase/seed.sql` because the Supabase CLI references it for local-dev seeding. It's reproduced here for completeness only.

**Purpose:** Truncates operational tables and inserts 20 sample events for the Teatro da Ilha do Governador.

```sql
-- Script para limpar o banco de dados e injetar 20 eventos do Teatro da Ilha do Governador
-- Execute este script no SQL Editor do Supabase

-- 1. Limpa todas as tabelas operacionais (mantém os teatros e usuários intactos)
TRUNCATE TABLE audit_logs, financial_transactions, event_staff, event_benefits, tickets, guests, employees, events RESTART IDENTITY CASCADE;

-- 2. Injeta os 20 últimos eventos
DO $$
DECLARE
    v_theater_id UUID;
BEGIN
    -- Tenta encontrar o Teatro da Ilha pelo slug
    SELECT id INTO v_theater_id FROM theaters WHERE slug ILIKE '%ilha%' LIMIT 1;
    
    -- Fallback: Se não achar, pega o primeiro teatro disponível
    IF v_theater_id IS NULL THEN
        SELECT id INTO v_theater_id FROM theaters LIMIT 1;
    END IF;

    IF v_theater_id IS NOT NULL THEN
        INSERT INTO events (theater_id, title, description, event_date, event_time, capacity, ticket_price, produtor)
        VALUES 
        (v_theater_id, 'Stand-up: Renato Albani', 'Show de comédia stand-up', '2025-12-10', '20:00', 700, 80.00, 'Produtora Riso'),
        (v_theater_id, 'A Bela e a Fera - O Musical', 'Espetáculo musical infantil', '2025-12-05', '16:00', 700, 60.00, 'Teatro Kids'),
        (v_theater_id, 'Diogo Almeida: Savana Pedagógica', 'Stand-up sobre a vida dos professores', '2025-11-28', '21:00', 700, 70.00, 'Comédia BR'),
        (v_theater_id, 'Nando Reis (Voz e Violão)', 'Show acústico com grandes sucessos', '2025-11-20', '21:30', 700, 150.00, 'MPB Produções'),
        (v_theater_id, 'Os Melhores do Mundo: Hermanoteu', 'Comédia clássica', '2025-11-15', '20:00', 700, 90.00, 'Cia Melhores do Mundo'),
        (v_theater_id, 'Paul Cabannes: Parisileiro', 'Stand-up com o humorista francês', '2025-11-08', '20:00', 700, 70.00, 'StandUp Comedy'),
        (v_theater_id, 'Show do Bita', 'Musical interativo para bebês e crianças', '2025-11-01', '15:00', 700, 50.00, 'Mundo Bita'),
        (v_theater_id, 'Abba Experience In Concert', 'Tributo musical à banda ABBA', '2025-10-25', '20:00', 700, 100.00, 'Tribute Prod'),
        (v_theater_id, 'Queen Tribute Brazil', 'Homenagem ao Queen', '2025-10-18', '21:00', 700, 120.00, 'Rock Tributos'),
        (v_theater_id, 'Tirullipa Show', 'Show de humor', '2025-10-10', '20:00', 700, 80.00, 'Humor Nordestino'),
        (v_theater_id, 'Bruna Louise', 'Stand-up comedy', '2025-10-05', '21:00', 700, 70.00, 'Comédia BR'),
        (v_theater_id, '4 Amigos', 'Thiago Ventura, Dihh, Afonso e Márcio', '2025-09-28', '20:00', 700, 100.00, '4 Amigos Prod'),
        (v_theater_id, 'Luccas Neto: A Escola de Aventureiros', 'Show infantil', '2025-09-20', '14:00', 700, 150.00, 'LN Produções'),
        (v_theater_id, 'Moana - Uma Aventura no Mar', 'Peça de teatro infantil', '2025-09-12', '16:00', 700, 50.00, 'Cia Teatral'),
        (v_theater_id, 'Whindersson Nunes', 'Show de comédia', '2025-09-05', '21:00', 700, 150.00, 'Non Stop'),
        (v_theater_id, 'Thiago Ventura: Modo Efetivo', 'Stand-up', '2025-08-28', '20:00', 700, 80.00, 'Ventura Produções'),
        (v_theater_id, 'Afonso Padilha', 'Especial de comédia', '2025-08-20', '20:00', 700, 70.00, 'Padilha Prod'),
        (v_theater_id, 'Monólogos da Vagina', 'Peça clássica', '2025-08-15', '21:00', 700, 60.00, 'Teatro BR'),
        (v_theater_id, 'Sítio do Picapau Amarelo', 'Peça infantil', '2025-08-08', '15:00', 700, 40.00, 'Infantil Cia'),
        (v_theater_id, 'O Auto da Compadecida', 'Teatro Nordestino', '2025-08-01', '20:00', 700, 50.00, 'Cia Ariano');
    END IF;
END $$;
```
