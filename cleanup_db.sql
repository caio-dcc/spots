-- Script de limpeza para garantir isolamento multi-tenant
-- Execute no Editor SQL do Supabase

-- 1. Deletar eventos órfãos (sem teatro associado)
DELETE FROM events WHERE theater_id IS NULL;

-- 2. Deletar logs de auditoria órfãos
DELETE FROM audit_logs WHERE theater_id IS NULL;

-- 3. Deletar convidados órfãos
DELETE FROM guests WHERE theater_id IS NULL;

-- 4. Deletar funcionários órfãos
DELETE FROM employees WHERE theater_id IS NULL;

-- Comentário: Agora todas as tabelas principais estão limpas de registros sem dono.
-- Todas as consultas no front-end já foram atualizadas para filtrar por theater_id.
