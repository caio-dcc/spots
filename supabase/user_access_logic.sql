-- =============================================================
-- GESTÃO DE ACESSO MULTI-MÓDULO (SPOTLIGHT UNIVERSE)
-- Este script implementa a validação de acesso baseada em 
-- assinatura/pagamento por módulo e remove a dependência de Slugs.
-- =============================================================

-- 1. Tabela de Acessos Autorizados
CREATE TABLE IF NOT EXISTS public.user_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL, -- 'THEATER', 'TOGETHER', 'WORKERS'
    entity_id UUID, -- theater_id, graduation_event_id, etc.
    is_paid BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_type, entity_id)
);

-- 2. Trigger para validar acesso antes de operações (Exemplo para Theaters)
CREATE OR REPLACE FUNCTION check_module_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Verifica se o usuário tem uma entrada de pagamento ativa para o módulo
    IF NOT EXISTS (
        SELECT 1 FROM user_access 
        WHERE user_id = auth.uid() 
        AND module_type = TG_ARGV[0] 
        AND is_paid = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Assinatura do módulo % não encontrada ou expirada.', TG_ARGV[0];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de aplicação:
-- CREATE TRIGGER trg_validate_theater_access 
-- BEFORE INSERT OR UPDATE ON events
-- FOR EACH ROW EXECUTE FUNCTION check_module_access('THEATER');

-- 3. Função Helper para o Frontend resolver a Entidade do Usuário
CREATE OR REPLACE FUNCTION get_user_entities()
RETURNS TABLE (module TEXT, entity_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT module_type, ua.entity_id 
    FROM user_access ua
    WHERE ua.user_id = auth.uid() 
    AND ua.is_paid = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
