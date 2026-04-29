-- Adiciona coluna de aprovação pública no evento
ALTER TABLE events ADD COLUMN public_approval INTEGER CHECK (public_approval >= 0 AND public_approval <= 100);

COMMENT ON COLUMN events.public_approval IS 'Medida de satisfação do público de 0 a 100 (preenchido pós-evento)';
