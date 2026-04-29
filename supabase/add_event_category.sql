-- Adiciona campo de categoria ao evento para possibilitar filtragem por tipo
ALTER TABLE events ADD COLUMN category TEXT;

COMMENT ON COLUMN events.category IS 'Tipo do evento (Ex: Teatro, Show, Palestra, Workshop)';
