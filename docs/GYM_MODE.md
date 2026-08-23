# Modo Academia

O Modo Academia é a superfície operacional de uma `WorkoutSession` ativa. Ele ocupa a janela inteira e oculta drawer, sidebar e cabeçalho global para reduzir distrações. A ficha continua sendo a fonte do planejamento; ao iniciar, a sessão recebe snapshots do nome, ordem, alvo, descanso e unidade de cada exercício.

## Estados do dia

- planejado: inicia a ficha agendada;
- ativo: retoma a única sessão ativa do perfil no exercício e série persistidos;
- concluído: abre o histórico e o resumo;
- descanso: explica o próximo treino e permite escolher uma sessão avulsa sem mudar calendário ou ficha.

`TrainingService.startSession` retorna a sessão ativa existente, impedindo duplicatas. Sessões e logs são sempre filtrados por `profileId`.

## Registro de séries

O próximo conjunto incompleto recebe foco. Carga e repetições anteriores são pré-preenchidas; vírgula e ponto decimais são aceitos. O blur persiste um `WorkoutSetLog` incompleto no IndexedDB e a confirmação atualiza o mesmo registro como concluído. Somente “Concluir série” conta a série. Séries concluídas oferecem Editar e Desfazer de forma explícita.

## Descanso e dispositivo

O descanso usa `restEndsAt`, nunca um contador acumulado. Ao voltar do segundo plano, `remainingRestSeconds` recalcula pelo relógio. O fim mostra o estado PRONTO e, quando suportado e autorizado, vibra ou envia uma notificação. `+30s` e `Pular` atualizam a sessão imediatamente. Wake Lock é opcional e tentado novamente quando a página volta a ficar visível.

## Ordem, troca e encerramento

Pular, substituir e reordenar afetam apenas a sessão. A ficha versionada não é reescrita. Finalizar exige confirmação e produz resumo com duração, séries, volume convencional, comparação e progressão dupla explicável. Cancelar preserva logs, marca `cancelled` e não conta como concluído.

## Recordes e progressão

Recordes usam apenas observações reais: maior carga, mais repetições naquela carga e maior volume de uma série (`carga × repetições`). Não há 1RM estimado. Kg e lb são calculados e exibidos separadamente. A progressão dupla só sugere aumentar quando todas as séries atingem o topo da faixa; ela informa, nunca prescreve.

## Atualização e offline

Shell, imagens e chunks são precacheados. Um worker novo ativa automaticamente, mas a janela não recarrega enquanto `gym-mode-active` estiver presente. Ao fechar a sessão/resumo, o reload pendente acontece sem pergunta. Isso preserva série, rascunho e descanso sem reintroduzir o banner de atualização.

## Acessibilidade e layout

Alvos principais têm no mínimo 44 px, labels são associados aos inputs, modais têm nome/role e o progresso expõe valores ARIA. O layout foi verificado em 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800, 1366×768, 1440×900 e 1920×1080, incluindo safe areas e preferência por movimento reduzido.
