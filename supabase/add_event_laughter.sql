-- Adiciona campo de risadas ao relatório final de eventos
ALTER TABLE events ADD COLUMN laughter_level INTEGER DEFAULT 0;

COMMENT ON COLUMN events.laughter_level IS 'Quantidade de risadas registrada ao fim do evento (para stand-up/comédia)';
