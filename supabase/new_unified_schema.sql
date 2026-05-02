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
