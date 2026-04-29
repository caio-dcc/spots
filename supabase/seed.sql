-- Script para limpar o banco de dados e injetar 20 eventos do Teatro da Ilha do Governador
-- Execute este script no SQL Editor do Supabase

-- 1. Limpa todas as tabelas operacionais (mantém os teatros e usuários intactos)
TRUNCATE TABLE audit_logs, financial_transactions, event_staff, event_benefits, tickets, guests, employees, events RESTART IDENTITY CASCADE;

-- 2. Injeta os 20 últimos eventos
DO $$
DECLARE
    v_theater_id UUID;
BEGIN
    -- Tenta encontrar o Teatro da Ilha pelo slug
    SELECT id INTO v_theater_id FROM theaters WHERE slug ILIKE '%ilha%' LIMIT 1;
    
    -- Fallback: Se não achar, pega o primeiro teatro disponível
    IF v_theater_id IS NULL THEN
        SELECT id INTO v_theater_id FROM theaters LIMIT 1;
    END IF;

    IF v_theater_id IS NOT NULL THEN
        INSERT INTO events (theater_id, title, description, event_date, event_time, capacity, ticket_price, produtor)
        VALUES 
        (v_theater_id, 'Stand-up: Renato Albani', 'Show de comédia stand-up', '2025-12-10', '20:00', 700, 80.00, 'Produtora Riso'),
        (v_theater_id, 'A Bela e a Fera - O Musical', 'Espetáculo musical infantil', '2025-12-05', '16:00', 700, 60.00, 'Teatro Kids'),
        (v_theater_id, 'Diogo Almeida: Savana Pedagógica', 'Stand-up sobre a vida dos professores', '2025-11-28', '21:00', 700, 70.00, 'Comédia BR'),
        (v_theater_id, 'Nando Reis (Voz e Violão)', 'Show acústico com grandes sucessos', '2025-11-20', '21:30', 700, 150.00, 'MPB Produções'),
        (v_theater_id, 'Os Melhores do Mundo: Hermanoteu', 'Comédia clássica', '2025-11-15', '20:00', 700, 90.00, 'Cia Melhores do Mundo'),
        (v_theater_id, 'Paul Cabannes: Parisileiro', 'Stand-up com o humorista francês', '2025-11-08', '20:00', 700, 70.00, 'StandUp Comedy'),
        (v_theater_id, 'Show do Bita', 'Musical interativo para bebês e crianças', '2025-11-01', '15:00', 700, 50.00, 'Mundo Bita'),
        (v_theater_id, 'Abba Experience In Concert', 'Tributo musical à banda ABBA', '2025-10-25', '20:00', 700, 100.00, 'Tribute Prod'),
        (v_theater_id, 'Queen Tribute Brazil', 'Homenagem ao Queen', '2025-10-18', '21:00', 700, 120.00, 'Rock Tributos'),
        (v_theater_id, 'Tirullipa Show', 'Show de humor', '2025-10-10', '20:00', 700, 80.00, 'Humor Nordestino'),
        (v_theater_id, 'Bruna Louise', 'Stand-up comedy', '2025-10-05', '21:00', 700, 70.00, 'Comédia BR'),
        (v_theater_id, '4 Amigos', 'Thiago Ventura, Dihh, Afonso e Márcio', '2025-09-28', '20:00', 700, 100.00, '4 Amigos Prod'),
        (v_theater_id, 'Luccas Neto: A Escola de Aventureiros', 'Show infantil', '2025-09-20', '14:00', 700, 150.00, 'LN Produções'),
        (v_theater_id, 'Moana - Uma Aventura no Mar', 'Peça de teatro infantil', '2025-09-12', '16:00', 700, 50.00, 'Cia Teatral'),
        (v_theater_id, 'Whindersson Nunes', 'Show de comédia', '2025-09-05', '21:00', 700, 150.00, 'Non Stop'),
        (v_theater_id, 'Thiago Ventura: Modo Efetivo', 'Stand-up', '2025-08-28', '20:00', 700, 80.00, 'Ventura Produções'),
        (v_theater_id, 'Afonso Padilha', 'Especial de comédia', '2025-08-20', '20:00', 700, 70.00, 'Padilha Prod'),
        (v_theater_id, 'Monólogos da Vagina', 'Peça clássica', '2025-08-15', '21:00', 700, 60.00, 'Teatro BR'),
        (v_theater_id, 'Sítio do Picapau Amarelo', 'Peça infantil', '2025-08-08', '15:00', 700, 40.00, 'Infantil Cia'),
        (v_theater_id, 'O Auto da Compadecida', 'Teatro Nordestino', '2025-08-01', '20:00', 700, 50.00, 'Cia Ariano');
    END IF;
END $$;
