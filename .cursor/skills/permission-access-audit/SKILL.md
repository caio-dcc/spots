---
name: permission-access-audit
description: Audita e corrige controle de acesso por organização e permissões no dashboard. Use quando o usuário reportar que rotas, menus, botões, APIs ou contexto de membro não refletem as permissões cedidas por owner para member.
disable-model-invocation: true
---

# Permission Access Audit

## Objetivo

Garantir que o controle de acesso por organização esteja consistente ponta a ponta:
- resolução da organização ativa;
- leitura de role/permissões do membro;
- bloqueio de rota;
- renderização condicional de menu, páginas e botões;
- aplicação das permissões no backend.

## Quando usar

Use esta skill quando houver relatos como:
- "usuário não vê rota que deveria ver";
- "botão de editar aparece para quem não pode";
- "owner marcou permissão mas não refletiu";
- "menu/sidebar não bate com permissões";
- "acesso diferente entre sessões/abas".

## Fluxo obrigatório

Copie e siga este checklist:

```md
Auditoria de Acesso
- [ ] 1. Confirmar contrato de permissões (lista única canônica)
- [ ] 2. Validar resolução de organização ativa (client + server + SQL helper)
- [ ] 3. Validar carga de contexto do membro (role + permissions)
- [ ] 4. Validar bloqueio de rotas no layout
- [ ] 5. Validar exibição de menu/itens na sidebar
- [ ] 6. Validar ações críticas por página (ex.: editar/excluir)
- [ ] 7. Validar APIs protegidas por organização/role
- [ ] 8. Validar cache/revalidação de permissões
- [ ] 9. Executar teste com owner e member
- [ ] 10. Registrar gaps e aplicar correções mínimas
```

## Regras de implementação

1. **Fonte única de permissões**
   - Mantenha uma lista canônica (`ALL_PERMISSIONS`) e reaproveite nos pontos de leitura/validação.
   - Toda nova permissão deve ser adicionada em:
     - frontend (metadados/UI),
     - backend (schema validação),
     - migração de dados/default.

2. **Organização ativa consistente**
   - Use o mesmo critério em client, server e SQL helper.
   - Se houver múltiplos vínculos, defina critério explícito e uniforme (ex.: vínculo mais recente).

3. **Defesa em profundidade**
   - Não confiar apenas na UI: bloquear rota e API também.
   - UI escondendo botão é UX; API é a proteção real.

4. **Owner/Admin vs Member**
   - Owner/admin com bypass explícito.
   - Member sempre validado por permissões individuais.

5. **Cache controlado**
   - Em alteração de permissões, invalidar/revalidar contexto.
   - Evitar estados divergentes entre layout e sidebar (usar mesma fonte de `memberCtx`).

## Matriz mínima de checagem

- **Rota `dashboard`**: exige permissão explícita quando for member.
- **Eventos**:
  - listar: `eventos` ou regra definida;
  - editar/cadastrar/excluir: `editar_evento`.
- **Funcionários**:
  - listar: `funcionarios`;
  - editar/cadastrar/remover: `editar_funcionarios`.
- **Demais módulos**:
  - verificar mapeamento entre permissão e rota/menu/ações.

## Padrão de correção

Ao identificar inconsistência:
1. Corrigir primeiro o contrato (permissão + contexto + organização ativa).
2. Corrigir depois bloqueio de rota.
3. Corrigir por fim a renderização de UI (menu/botões).
4. Revalidar em sessão de member e owner.

## Resultado esperado

Após aplicar esta skill:
- owner marca/desmarca permissões e member reflete corretamente;
- rotas bloqueadas não ficam acessíveis por URL direta;
- sidebar e botões seguem exatamente o contexto de permissões ativo;
- APIs respeitam organização e role/permissões.
