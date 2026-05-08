---
name: github-upload-pre-clean
description: >-
  Remove artefatos descartáveis de desenvolvimento (markdown rascunho, backups soltos,
  caches/build tracejados pelo Git, duplicatas locais de migration, artefatos fora do
  fluxo Supabase) e depois orienta commit/push/PR no GitHub. Use quando o usuário pedir
  upload ao GitHub após limpar lixo de dev, migrations antigas supérfluas ou markdowns antigos,
  ou ao usar create-skill com esse fluxo.
disable-model-invocation: true
---

# Upload ao GitHub com limpeza prévia de trash de desenvolvimento

## Verbatim — texto do usuário

Faça upload para o GitHub, porém antes limpe todo arquivo trash que pode ter sido criado durante o desenvolvimento (Migrations Antigas, markdowns antigos).

## Interpretação operacional (para o agente)

Ao aplicar o texto acima: remover apenas artefatos **descartáveis ou redundantes** no working tree; **não** apagar migrações já aplicadas em ambientes compartilhados sem lista nominal confirmada pelo usuário; **não** reescrever histórico remoto salvo pedido explícito.

## Quando usar

- Pedido explícito de enviar ao GitHub depois de “limpar a casa”.
- Branches cheias de arquivos de scratch, duplicatas de migration ou markdown temporário.
- `git status` mostrando coisas que não devem ir para o repositório (build cache, logs, `.next`, artefatos de IDE).

## Regras de segurança (obrigatórias)

1. **`supabase/migrations/`**: não apagar migrations que já foram aplicadas em staging/produção ou que fazem parte da linha do tempo aceita pelo time. Só remover:
   - arquivos **duplicados** não aplicados em lugar nenhum (mesmo conteúdo ou erro óbvio de cópia), ou
   - arquivos fora de `supabase/migrations/` (SQL solto na raiz, `temp_migration.sql`, etc.).
   Se houver dúvida: **parar e perguntar** ao usuário com a lista exata de arquivos.
2. **Markdown**: remover apenas rascunhos/obsoletos claros (`TEMP*.md`, notas pessoais, duplicatas de docs já consolidadas). Não remover `README`, docs legais, specs ou pastas `docs/` oficiais sem instrução.
3. **Nunca** commitar segredos: `.env`, `.env.local`, chaves, dumps com PII.
4. Preferir **não** apagar histórico com `git rebase`/force-push neste fluxo, salvo pedido explícito.

## Checklist — limpeza antes do push

```md
Pré-push cleanup
- [ ] Rodar `git status` e classificar: código vs trash vs gerados
- [ ] Confirmar `.gitignore` cobre `.next/`, caches Turbopack, `node_modules/`, `.env*.local`
- [ ] Remover ou restaurar arquivos rastreados por engano (build/cache)
- [ ] Markdowns: apagar só rascunhos/duplicatas óbvias (lista ao usuário se grande)
- [ ] Migrações: só remover duplicatas/fora da pasta oficial ou não aplicadas — confirmar se incerto
- [ ] Revisar arquivos deletados no dashboard Claude/agent (`D .agents/`) antes de commitar limpezas grandes
- [ ] `npm run lint` / `npm run test` (ou equivalente do projeto) se houve mudanças relevantes
- [ ] Commit atômico e mensagem clara (ex.: chore: remove dev artifacts before push)
- [ ] Push na branch correta; abrir PR se fluxo do repo exige revisão
```

## Artefatos típicos de trash em projetos Next/Supabase

| Alvo | Ação usual |
|------|------------|
| `.next/`, caches Turbopack | Manter ignorados; se aparecerem no `git status`, remover do índice com `git rm -r --cached` apenas se a política do repo permitir |
| Logs (`*.log`) | Apagar |
| SQL na raiz / scripts temporários duplicados | Avaliar; mover ou apagar após confirmar não uso |
| Migrations duplicadas com mesmo timestamp ou cópia errada | Listar para o usuário; remover só após OK |
| `.agents/`, `.claude/` deletados | Commit único de “cleanup tooling”; garantir que o time aceita |

## Upload ao GitHub (fluxo)

1. Branch atualizada com `main`/develop conforme convenção do repo.
2. `git add` seletivo (evitar `git add .` cego em repos grandes logo após limpeza).
3. Mensagem de commit descritiva; um foco por commit quando possível.
4. `git push origin <branch>`; criar PR com descrição resumindo removidos + mudanças funcionais.

## Anti-patterns

- Apagar migrations “por parecer antigas” sem checar `migration_history`/deploy.
- Forçar push para sobrescrever história sem acordo do time.
- Misturar em um único PR grandes mudanças de produto com megabytes de limpeza sem comunicação.
