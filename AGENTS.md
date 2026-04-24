# Agent Rules (Theater Flow)

## Ciclo de Implementação de UI
Sempre siga este ciclo para qualquer implementação de UI:
1. **Pesquisa & Análise:** Analisar os requisitos ou a imagem de referência fornecida.
2. **Execução (Act):** Implementar o código (preferencialmente usando Tailwind CSS e Shadcn UI).
3. **Verificação (Screenshot Loop):** 
   - Usar o Chrome DevTools MCP para abrir a página local.
   - Capturar um screenshot da implementação atual.
   - Comparar visualmente com a referência original.
   - Identificar discrepâncias (cores, fontes, espaçamentos, alinhamentos).
4. **Refinamento:** Corrigir o código e repetir o passo 3 até atingir >98% de fidelidade visual.

## 📐 Diretrizes de Design e UI
- **Fidelidade Visual:** O objetivo é a precisão de pixel. Se uma imagem de referência for fornecida, a comparação deve ser incessante até a aprovação.
- **Estética:** Seguir padrões modernos (ex: estilo Apple/Minimalista) a menos que instruído de outra forma.
- **Responsividade:** Garantir que o design funcione perfeitamente em mobile e desktop.
- **Assets:** Usar placeholders inteligentes ou buscar imagens via Unsplash API se necessário.

## 💻 Padrões Técnicos
- **Tech Stack Preferencial:** Next.js, React, Tailwind CSS, Lucide Icons, Supabase (TDD Project).
- **Qualidade de Código:** Código modular, limpo e bem documentado internamente.
- **Hooks e Scripts:** Utilizar scripts automatizados para tarefas repetitivas (deploy, limpeza de cache, etc).

## 🧠 Gestão de Contexto
- **Densidade de Informação:** Manter as respostas concisas e ricas em informação.
- **Limpeza:** Periodicamente revisar o diretório para remover arquivos temporários ou logs desnecessários.
- **Memória:** Atualizar este arquivo se novos padrões de design ou regras de negócio forem estabelecidos.

## 🚫 Restrições
- Nunca execute comandos de exclusão em massa (`rm -rf`) sem confirmação explícita do usuário.
- Não poluir o contexto com logs extensos de API; resumir as saídas.
