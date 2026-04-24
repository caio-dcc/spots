-- Script de atualização para suportar Fluxo de Caixa baseado em Vendas
-- Execute no Editor SQL do Supabase

ALTER TABLE guests ADD COLUMN benefit_id uuid REFERENCES event_benefits(id) ON DELETE SET NULL;

-- Comentário: A coluna benefit_id agora permite vincular cada venda/convidado a um preço específico.
-- O dashboard de Fluxo de Caixa agora utiliza: SUM(guests.quantity * COALESCE(event_benefits.valor, events.ticket_price))
