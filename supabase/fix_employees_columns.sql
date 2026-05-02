-- ============================================================
-- Migration: Correção de nomes de colunas na tabela employees
-- Objetivo: Garantir que 'is_contracted' exista para compatibilidade com o Dashboard
-- ============================================================

-- 1. Adicionar colunas se não existirem
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_contracted BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0;

-- 2. Sincronizar dados de 'eh_fixo' para 'is_contracted' caso eh_fixo já exista e tenha dados
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='eh_fixo') THEN
        UPDATE employees SET is_contracted = eh_fixo WHERE is_contracted IS NULL OR is_contracted = false;
    END IF;
END $$;
