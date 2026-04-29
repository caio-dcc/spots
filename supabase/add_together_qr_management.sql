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
