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
