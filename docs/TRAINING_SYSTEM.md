# Sistema de treinos

Treinos é um caderno inteligente local-first. Organiza ficha, agenda, execução e histórico, mas não substitui avaliação profissional nem interpreta clinicamente limitações informadas.

## Arquitetura

`TrainingWorkspace` usa `TrainingService`, que depende dos contratos `TrainingProfileRepository`, `ExerciseRepository`, `WorkoutPlanRepository` e `WorkoutSessionRepository`. Dexie implementa esses contratos; a UI não acessa tabelas diretamente para regras de sessão.

Dados compartilhados: catálogo DEFYN de exercícios. Dados pessoais: perfil de treino, exercícios próprios, favoritos, planos, versões, sessões e séries — sempre com `profileId`.

## Planos e versões

`WorkoutPlan` contém versões imutáveis. Cada edição cria `WorkoutPlanVersion` nova com templates e prescrições ordenadas. A versão antiga permanece disponível para explicar sessões passadas. Divisões de 1 a 6 dias são pontos de partida determinísticos e editáveis; seis dias usa PPL A/B de segunda a sábado quando esses dias foram escolhidos.

## Sessões e séries

Ao iniciar, `WorkoutSession` congela nomes, músculos, equipamentos e prescrições da versão ativa. Cada `WorkoutSetLog` é salvo imediatamente. A sessão ativa é consultada por `[profileId+status]`, portanto navegação ou reload retomam o mesmo treino.

Descanso usa `restEndsAt`; `setInterval` apenas atualiza a apresentação. Concluir, corrigir, remover série, pular e substituir somente hoje preservam a ficha. Carga aceita kg, lb, nível/placa ou ausência; exercícios por tempo usam segundos.

O exercício atual também é persistido, então reload retoma a posição exata. Carga aceita vírgula brasileira. A interface mostra a última sessão e a miniatura do próximo exercício. Wake lock e notificação de fim de descanso são opt-in por sessão, só aparecem com suporte e não prometem execução em background.

## Histórico e fontes de progresso

Sessões concluídas preservam duração, exercícios e séries. Volume soma apenas carga convencional × repetições. Logs fornecem frequência, performance e recordes futuros sem redesenhar Progresso nesta etapa.

Treino não altera automaticamente calorias. O GET nutricional já considera o fator de atividade; somar “calorias queimadas” novamente causaria dupla contagem. Esta etapa não estima gasto do treino.
