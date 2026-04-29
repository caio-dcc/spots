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
