-- Script SQL para remover a lógica de uma conta ter que estar relacionada a um teatro obrigatoriamente.

DO $$ 
BEGIN
    -- Remover a restrição NOT NULL da coluna theater_id na tabela user_roles
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'theater_id'
    ) THEN
        ALTER TABLE public.user_roles ALTER COLUMN theater_id DROP NOT NULL;
    END IF;

    -- Caso exista alguma Foreign Key que impeça a existência de uma conta sem teatro, 
    -- ela também poderia ser relaxada aqui, porém o DROP NOT NULL é o passo principal.
    
    -- Exemplo para dropar a constraint caso necessário:
    -- ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_theater_id_fkey;
END $$;
