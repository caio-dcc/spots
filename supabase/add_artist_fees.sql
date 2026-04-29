-- Migração para adicionar suporte a Artistas e Cachês no Evento
-- Se a coluna artistas não existir, cria como JSONB. Se existir, converte para JSONB.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'artistas') THEN
        ALTER TABLE events ADD COLUMN artistas JSONB DEFAULT '[]'::jsonb;
    ELSE
        ALTER TABLE events ALTER COLUMN artistas TYPE JSONB USING to_jsonb(artistas);
    END IF;
END $$;

COMMENT ON COLUMN events.artistas IS 'Lista de artistas e seus respectivos cachês no formato [{"name": "...", "fee": 0}]';
