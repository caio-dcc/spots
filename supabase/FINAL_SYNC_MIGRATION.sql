-- FINAL SYNC: Sincronização final do schema com as mudanças de UI
-- 1. Unificar campo de detalhes e adicionar theater_id em eventos
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE IF EXISTS public.events ADD COLUMN IF NOT EXISTS theater_id UUID REFERENCES public.theaters(id) ON DELETE SET NULL;

-- 2. Garantir que theaters tenha os campos de endereço e financeiros
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.theaters ADD COLUMN IF NOT EXISTS rent_price NUMERIC(10,2) DEFAULT 0;

-- 3. Migração de dados (Pulada pois additional_details não existe)

-- 4. Criar índice para performance em buscas por local
CREATE INDEX IF NOT EXISTS idx_events_theater_id ON public.events(theater_id);

-- 5. Atualizar RLS para Locais (garantir que donos e membros vejam)
DROP POLICY IF EXISTS "Users can manage their own locations" ON public.theaters;
CREATE POLICY "Users and team can manage locations" ON public.theaters 
FOR ALL USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.team_members WHERE owner_id = theaters.user_id AND member_id = auth.uid())
);
