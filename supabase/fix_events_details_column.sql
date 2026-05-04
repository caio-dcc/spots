-- Ajusta coluna de detalhes do evento para bater com o código (renomeia se necessário)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'additional_details') THEN
    ALTER TABLE public.events RENAME COLUMN additional_details TO details;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'details') THEN
    ALTER TABLE public.events ADD COLUMN details TEXT;
  END IF;
END $$;
