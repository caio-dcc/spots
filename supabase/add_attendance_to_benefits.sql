-- Adiciona coluna de contagem de presença por tipo de ingresso
ALTER TABLE event_benefits ADD COLUMN IF NOT EXISTS attendance_count INTEGER DEFAULT 0;
