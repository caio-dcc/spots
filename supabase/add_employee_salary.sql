-- Adiciona campo de Salário ao cadastro de funcionários e flag de funcionário fixo
ALTER TABLE employees ADD COLUMN salario NUMERIC(10,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN eh_fixo BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.salario IS 'Valor do salário mensal para funcionários fixos';
COMMENT ON COLUMN employees.eh_fixo IS 'Define se o funcionário é fixo (recebe salário) ou freelancer (recebe diária)';
