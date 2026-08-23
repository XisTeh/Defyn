# Sistema de treinos

Treinos é um caderno inteligente local-first. Organiza ficha, agenda, execução e histórico, mas não substitui avaliação profissional nem interpreta clinicamente limitações informadas.

## Arquitetura

`TrainingWorkspace` usa `TrainingService`, que depende dos contratos `TrainingProfileRepository`, `ExerciseRepository`, `WorkoutPlanRepository` e `WorkoutSessionRepository`. Dexie implementa esses contratos; a UI não acessa tabelas diretamente para regras de sessão.

Dados compartilhados: catálogo DEFYN de exercícios. Dados pessoais: perfil de treino, exercícios próprios, favoritos, planos, versões, sessões e séries — sempre com `profileId`.

## Planos e versões

`WorkoutPlan` contém versões imutáveis. Cada edição cria `WorkoutPlanVersion` nova com templates e prescrições ordenadas. O nome do treino é texto livre e editável na própria ficha; a versão antiga permanece disponível para explicar sessões passadas. Divisões de 1 a 6 dias são apenas pontos de partida determinísticos e editáveis; seis dias usa PPL A/B de segunda a sábado quando esses dias foram escolhidos.

## Sessões e séries

Ao iniciar, `WorkoutSession` congela o nome livre do template, nomes, músculos, equipamentos e prescrições da versão ativa. Uma renomeação posterior só aparece nas próximas sessões; histórico, cards e sessão em andamento mantêm o snapshot. Cada `WorkoutSetLog` é salvo imediatamente. A sessão ativa é consultada por `[profileId+status]`, portanto navegação ou reload retomam o mesmo treino.

Descanso usa `restEndsAt`; `setInterval` apenas atualiza a apresentação. Concluir, corrigir, remover série, pular e substituir somente hoje preservam a ficha. Carga aceita kg, lb, nível/placa ou ausência; exercícios por tempo usam segundos.

O exercício atual também é persistido, então reload retoma a posição exata. Carga aceita vírgula brasileira. A interface mostra a última sessão e a miniatura do próximo exercício. Wake lock e notificação de fim de descanso são opt-in por sessão, só aparecem com suporte e não prometem execução em background.

Em um dia sem template planejado, a Home mantém a mensagem de descanso e permite escolher qualquer template da versão ativa para uma sessão avulsa. A sessão usa o mesmo snapshot e histórico das sessões planejadas, mas não edita o plano, os dias preferidos ou o cronograma. A semana só marca um treino planejado como concluído quando `templateId` e dia correspondem; uma sessão extra no descanso não altera essa semântica. Qualquer sessão ativa tem prioridade visual sobre descanso ou planejamento.

## Histórico e fontes de progresso

Sessões concluídas preservam duração, exercícios e séries. Volume soma apenas carga convencional × repetições. Logs fornecem frequência, performance e recordes futuros sem redesenhar Progresso nesta etapa.

Treino não altera automaticamente calorias. O GET nutricional já considera o fator de atividade; somar “calorias queimadas” novamente causaria dupla contagem. Esta etapa não estima gasto do treino.
# Etapa 08

A sessão ativa usa a interface dedicada descrita em [GYM_MODE.md](GYM_MODE.md). Rascunhos são `WorkoutSetLog.completed = false`; confirmação, edição e undo reutilizam/removem o mesmo log. Ordem, pulo e substituição são mutações da sessão, não da versão da ficha. Finalização e cancelamento são estados distintos.
