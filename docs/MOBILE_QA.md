# QA mobile

## Matriz visual

- telefones: 320, 360, 375, 390 e 430 px;
- tablets: 768, 820 e 1024 px;
- desktop: 1280, 1366, 1440 e 1920 px.

Verificar em cada família: ausência de overflow horizontal, cabeçalhos legíveis, drawer/sheets sobre safe area, teclado sem ocultar ação primária, alvos de toque, foco visível e uso completo sem hover.

## Roteiros

1. instalar no Android; instalar no iOS por Compartilhar; confirmar ação oculta em standalone;
2. carregar uma vez, desligar rede, reabrir Hoje/Treinos/Progresso/Alimentos/Receitas/Backup;
3. fotografar e selecionar rótulo, trocar imagem, revisar campo ambíguo e salvar sem reter foto;
4. capturar foto de frente/lado/costas e confirmar que categoria, preview e avatar não se misturam;
5. iniciar treino, registrar carga `12,5`, recarregar, retomar exercício/séries/timer e testar +30/Pular;
6. ativar wake lock/notificação por toque, negar permissões e conferir fallback;
7. simular atualização durante treino e confirmar adiamento;
8. exportar, compartilhar quando suportado, validar e restaurar backup;
9. testar pressão de armazenamento e pedido de persistência.

## Estado desta entrega

QA da reconstrução 06.2 com viewport controlada foi executado em 320, 360, 375, 390 e 430 px no mobile e em 1280, 1440 e 1920 px no desktop.

Resultados observados:

- documento sem overflow horizontal em todos os tamanhos;
- barra de navegação inferior removida do DOM; drawer mobile completo, rolável e com foco inicial/devolvido;
- sidebar desktop preservada com 276 px em 1280 e 1920;
- Hoje, Diário, Alimentos, Receitas, Planejamento, Treinos, Progresso, Ficha e Backup percorridos a 375 px sem overflow do documento;
- sheet de alimento do Diário com rolagem interna, busca no topo e CTA final visível;
- OCR começa somente com câmera, galeria e preenchimento manual; câmera usa `capture=environment`, galeria não usa `capture` e nenhum fieldset aparece antes da escolha;
- Treino validado nos estados sem ficha, planejado e concluído, além de sessão, série salva, descanso, +30/Pular e próximo exercício;
- cards de exercícios exibem ilustração, músculo/equipamento, séries, alvo e descanso;
- cabeçalhos, abas e CTA do Treino permanecem contidos a 320 px.

Lint, typecheck, **178 testes em 33 arquivos** e build PWA estão aprovados. **Não houve teste físico em smartphone nesta entrega**; câmera real, teclado de Android/iOS, instalação, safe areas, suspensão de background, wake lock e notificações permanecem obrigatórios antes de publicar.
