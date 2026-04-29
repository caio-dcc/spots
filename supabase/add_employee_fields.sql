-- Adiciona campos de Diária e Observações ao cadastro de funcionários
ALTER TABLE employees ADD COLUMN diaria NUMERIC(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN observacoes TEXT;

COMMENT ON COLUMN employees.diaria IS 'Valor padrão da diária paga ao funcionário';
COMMENT ON COLUMN employees.observacoes IS 'Notas internas sobre o colaborador';
