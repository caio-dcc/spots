# Agent Skills deste repositório

Todas as **skills criadas para este projeto** ficam nesta pasta: cada skill é um subdiretório com `SKILL.md`.

## Índice

| Pasta | Arquivo | Uso |
|-------|---------|-----|
| `permission-access-audit` | [SKILL.md](permission-access-audit/SKILL.md) | Auditoria de acesso por organização/permissões no dashboard e APIs. |
| `github-upload-pre-clean` | [SKILL.md](github-upload-pre-clean/SKILL.md) | Limpar artefatos descartáveis de desenvolvimento antes de commit/push ao GitHub (com regras para migrations e markdown). |

## Convenção

- Novas skills do time: criar `.cursor/skills/<nome-kebab>/SKILL.md` com frontmatter `name` e `description`.
- Documentação auxiliar opcional no mesmo diretório (`reference.md`, etc.), um nível de profundidade a partir deste README.

## Agents (não são SKILL)

Arquivos em `.cursor/agents/` seguem outro formato (ex.: playbooks). Não substituem as skills acima.
