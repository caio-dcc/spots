-- Script para limpar TODOS os registros operacionais do banco de dados My Spot
-- Isso manterá os usuários, perfis (user_roles) e teatros (theaters) intactos para que o sistema continue funcionando.
-- Execute este script na aba "SQL Editor" do seu painel Supabase.

DO $$ 
DECLARE
    t text;
    tabelas text[] := ARRAY['audit_logs', 'financial_transactions', 'event_staff', 'event_benefits', 'tickets', 'guests', 'employees', 'events'];
BEGIN
    FOR i IN 1 .. array_length(tabelas, 1) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tabelas[i]) THEN
            EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', tabelas[i]);
        END IF;
    END LOOP;
END $$;
