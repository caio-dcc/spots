-- Adiciona colunas para controle de visibilidade pública e thumbnail nos eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Atualiza as políticas de RLS para permitir que qualquer pessoa (anon/autenticado) veja eventos públicos
-- Primeiro removemos políticas conflitantes se existirem (opcional, mas seguro)
-- DROP POLICY IF EXISTS "Anyone can view public events" ON public.events;

CREATE POLICY "Anyone can view public events" ON public.events
    FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);
