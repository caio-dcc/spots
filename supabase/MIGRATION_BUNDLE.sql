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
