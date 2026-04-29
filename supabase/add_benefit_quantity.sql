-- Adiciona coluna de quantidade na tabela de benefícios de eventos
ALTER TABLE event_benefits ADD COLUMN quantity INTEGER DEFAULT 0;

COMMENT ON COLUMN event_benefits.quantity IS 'Quantidade de ingressos disponíveis para este benefício específico';
