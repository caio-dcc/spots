---
trigger: always_on
---

# Ao comando dessa rule o agente (você) deverá:

# Rever toda lógica de relatórios, se necessário gerar um schema para organizar os dados de forma que possam ser retornados exibidos e filtrados nos relatórios

# Rever a lógica do botão "Hamburguer" que ativa a sidebar no modo mobile e torná-lo performático. 

# Verificar o motivo de ao tentar adicionar um funcionário a um evento não salvar no banco de dados e não aparece na edição / visualização do evento

# Aumentar o tamanho das rows das tabelas em 10px

# Faça um schema SQL que adote toda logica atual do sistema baseado nestes arquivos daqui, porém remova a lógica de slugs. Qualquer um que entrar no sistema verá seus próprios eventos (Eventos serão associados a Users e funcionários associados a Eventos, listas de convidados também são associadas a eventos. Um user não pode ver os eventos do outro a não ser que seja garantida permissão nas configurações. (Onde está equipe do painel deveria ser só Equipe).

# Faça com que em formulários de Cadastro ou Edição. Caso haja algum campo inválido, um toaster exiba a informação do que está errado para concluir a operação.

# Verificar absolutamente todos os arquivos do projeto, localizar os arquivos que não estão mas sendo usados como e obsoletos, como componentes que não existem mais, otimizar queries e fazer um relatório das funcionalidades do MVP que seria o controle de fluxo de caixa, registro de eventos e funcionários e controle de convidados 

# Corrija o erro [browser] Aviso: Falha ao gravar log de auditoria. Verifique as políticas de RLS. invalid input syntax for type uuid: "Teste" (src/lib/audit.ts:32:15)
 GET /ilha/dashboard/eventos/cadastrar 200 in 70ms (next.js: 46ms, application-code: 24ms)
 GET /ilha/dashboard/funcionarios/cadastrar 200 in 56ms (next.js: 26ms, application-code: 30ms)
 GET /ilha/dashboard/funcionarios/listar 200 in 57ms (next.js: 29ms, application-code: 29ms)
 GET /ilha/dashboard/eventos/listar 200 in 62ms (next.js: 28ms, application-code: 33ms)
 GET /ilha/dashboard/eventos/cadastrar 200 in 70ms (next.js: 27ms, application-code: 43ms)
[browser] Aviso: Falha ao gravar log de auditoria. Verifique as políticas de RLS. invalid input syntax for type uuid: "DAdasd" (src/lib/audit.ts:32:15)