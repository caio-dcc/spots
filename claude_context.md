# Spotlight ERP: Contexto Consolidado

## 🎯 Objetivo do Projeto
Transformar o Spotlight em um ERP robusto focado em **Organizadores, Teatros e Produções Culturais**.

## 🏗️ Arquitetura de Branches
- **`main` (ERP)**: Versão ativa para gestão. Foco em Backstage, Staff (Freelancers/CLT), Finanças de Produção e Auditoria. Sem fluxo de checkout público.
- **`ticket-sales-legacy` (Vendas)**: Branch legada contendo toda a lógica de venda de ingressos, checkout Stripe e mosaico de eventos público.

## 💾 Banco de Dados (SQL)
- Toda a história de migrações foi consolidada em [SQL_history.md](file:///d:/spots/SQL_history.md).
- Os arquivos originais em `supabase/migrations/` foram removidos para limpeza.

## 🚀 Estado Atual
- **Build**: Validado e passando na `main`.
- **UI (Main)**: Sidebar reorientada para "ERP Organizador: Theaters Edition". Landing page focada em B2B (organizadores). Admin Dashboard focado em produtores.
- **UI (Legacy)**: Sidebar focada em "Monitor de Vendas" e "Ganhos".

## 📋 Próximos Passos (ERP)
1. Criar tabelas de `expenses` e `revenues` no banco.
2. Implementar dashboard financeiro de produção (Ganhos de Venda [visto pela API/DB] vs Custos de Staff).
3. Refinar gestão de assentos para o modo "Theaters".
