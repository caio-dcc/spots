-- Adiciona campos para o ciclo de vida do evento e relatórios finais
ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'pendente';
ALTER TABLE events ADD COLUMN applause_level INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN closing_observations TEXT;
ALTER TABLE events ADD COLUMN finished_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN events.status IS 'Status do evento: pendente, iniciado, finalizado';
COMMENT ON COLUMN events.applause_level IS 'Quantidade de palmas registrada ao fim do evento';
COMMENT ON COLUMN events.closing_observations IS 'Observações finais do staff após o término';
