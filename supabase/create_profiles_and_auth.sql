-- =============================================================
-- CREATE PROFILES TABLE + USER TYPE DIFFERENTIATION
-- =============================================================

-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'customer')),
    full_name TEXT,
    cpf TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Usuários podem ver/editar seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- RLS: Service role pode fazer tudo (para criar perfil no webhook)
CREATE POLICY "Service role can manage profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- Índices
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Função para registrar quando um novo usuário é criado via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente após signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- ADICIONAR CAMPOS FALTANTES A EVENTOS E INGRESSOS
-- =============================================================

-- Adicionar coluna house_id aos eventos (para suportar múltiplas casas)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS house_id UUID;

-- Índice para busca rápida por casa
CREATE INDEX IF NOT EXISTS idx_events_house_id ON events(house_id);

-- =============================================================
-- AUDIT LOGS TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Função para logging automático
CREATE OR REPLACE FUNCTION public.log_audit_entry(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_before_value JSONB DEFAULT NULL,
    p_after_value JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, before_value, after_value)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before_value, p_after_value);
END;
$$ LANGUAGE plpgsql;
