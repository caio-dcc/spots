# Componentes e Lógicas de Bilheteria Removidos (Versão Teste)

Este documento registra as funcionalidades removidas ou desativadas para a versão simplificada do ERP Spotlight.

## 1. Taxas de Serviço
- **Taxa Spotlight**: Removida dos cálculos de lucro projetado e de todos os relatórios financeiros finais (Excel, PDF e Fatura). O sistema agora considera 0% de taxa para fins de teste.
- **Arquivos Afetados**:
  - `src/app/dashboard/eventos/listar/page.tsx`
  - `src/app/dashboard/eventos/editar/[id]/page.tsx` (se aplicável)
  - `src/components/EventForm.tsx` (exibição de receita)

## 2. Rotas e Navegação
- **Check-in de Bilheteria (Filha de Eventos)**: A rota `/dashboard/eventos/checkin` foi removida em favor de uma rota centralizada `/dashboard/checkin`.
- **Organização**: A rota `/dashboard/configuracoes/organizacao` foi removida.
- **Stripe**: Todas as integrações de Connect e Chaves Secretas foram desativadas/removidas.

## 3. Interface de Eventos
- **Campos de Formulário**: Removidos campos "Categoria" e "Teatro/Localidade" do `EventForm.tsx`.
- **Lista de Convidados em Tabelas**: A visualização rápida de lista de convidados na listagem de eventos foi removida para simplificar a UI.
- **Botões de Importação/Exportação**: Consolidados em menus dropdown no Gerador de Lista.

## 4. Check-in
- **Unificação**: O "Check-in Online" (anteriormente `/dashboard/convidados/checkin`) agora é o portal principal de Check-in em `/dashboard/checkin`, permitindo a seleção de qualquer evento ativo.
