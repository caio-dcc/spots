-- =============================================================
-- ADMIN /view SUPER-ADMIN SETUP
-- =============================================================
-- Cria tabela super_admins (login customizado isolado de auth.users)
-- + colunas de controle de plano e acesso em profiles.
--
-- Senha armazenada como scrypt(salt:hash) — nunca plaintext.
-- Bootstrap email: altmarinscript@gmail.com
-- =============================================================

-- 1. Tabela super_admins -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,           -- formato: "salt_hex:hash_hex" (scrypt)
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode tocar nesta tabela. authenticated/anon: zero acesso.
DROP POLICY IF EXISTS "service_role full access super_admins" ON public.super_admins;
CREATE POLICY "service_role full access super_admins"
    ON public.super_admins FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- 2. Tabela de sessões super-admin (HMAC stateless seria ok, mas com tabela
--    podemos revogar e auditar logins).
CREATE TABLE IF NOT EXISTS public.super_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,       -- sha256 do token enviado no cookie
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access super_admin_sessions" ON public.super_admin_sessions;
CREATE POLICY "service_role full access super_admin_sessions"
    ON public.super_admin_sessions FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_token ON public.super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_expires ON public.super_admin_sessions(expires_at);

-- 3. Bootstrap do super-admin (idempotente) ----------------------------------
-- Hash gerado com node crypto.scryptSync(password, salt, 64).
INSERT INTO public.super_admins (email, password_hash)
VALUES (
    'altmarinscript@gmail.com',
    '2a62dd67ebf5f5b892a80b0ef1cbd8d3:c3eb9380355391223e4e72d6bfff8d10a69bc129e5d03b4b63bd052a981c9861e3a3963f88ca1ea38c31b56d24d558d022bd63c3bdd73213191d741cd9a2dc07'
)
ON CONFLICT (email) DO NOTHING;

-- 4. Controle de organizadores em profiles -----------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS access_disabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'essencial'
    CHECK (plan_tier IN ('essencial', 'profissional', 'enterprise'));

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_access_disabled ON public.profiles(access_disabled);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_tier ON public.profiles(plan_tier);

-- 5. Política de leitura agregada para o super-admin -------------------------
-- Não criamos uma policy de leitura "para super-admin" em profiles porque o
-- /admin/view sempre acessa via service_role no servidor. Isso mantém a
-- proteção máxima: nenhum cliente browser jamais consegue listar profiles.

-- =============================================================
-- VERIFICAÇÃO
-- =============================================================
-- SELECT email, created_at FROM public.super_admins;
-- SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('access_disabled','plan_tier');
