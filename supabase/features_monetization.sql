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
  nfse_xml          TEXT,
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
