-- Adiciona coluna de "não compareceu" na tabela de convidados
ALTER TABLE guests ADD COLUMN no_show BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN guests.no_show IS 'Indica se o convidado foi marcado como ausente (não veio)';
