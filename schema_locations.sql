CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theater_id UUID REFERENCES theaters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    "isPartner" BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Adicionar location_id nas tabelas operacionais
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS current_location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Inserir uma Localidade Padrão para os teatros existentes e vincular os dados atuais a ela
DO $$
DECLARE
    t RECORD;
    new_loc_id UUID;
BEGIN
    FOR t IN SELECT * FROM theaters LOOP
        -- Verifica se já tem uma localidade para não duplicar
        IF NOT EXISTS (SELECT 1 FROM locations WHERE theater_id = t.id) THEN
            INSERT INTO locations (theater_id, name, capacity) VALUES (t.id, 'Principal', 500) RETURNING id INTO new_loc_id;
            
            UPDATE events SET location_id = new_loc_id WHERE theater_id = t.id;
            UPDATE employees SET location_id = new_loc_id WHERE theater_id = t.id;
            UPDATE financial_transactions SET location_id = new_loc_id WHERE theater_id = t.id;
            UPDATE user_roles SET current_location_id = new_loc_id WHERE theater_id = t.id;
        END IF;
    END LOOP;
END $$;
