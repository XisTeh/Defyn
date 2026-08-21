# QA mobile

## Matriz visual

- telefones: 320, 360, 375, 390 e 430 px;
- tablets: 768, 820 e 1024 px;
- desktop: 1280, 1366, 1440 e 1920 px.

Verificar em cada família: ausência de overflow horizontal, cabeçalhos legíveis, bottom nav/sheets sobre safe area, teclado sem ocultar ação primária, alvos de toque, foco visível e uso completo sem hover.

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

Lint, typecheck, testes, build e QA no navegador local a 1280 px fazem parte da validação. A matriz acima foi documentada e os breakpoints foram inspecionados, mas a ferramenta conectada não permitiu redimensionar a viewport nesta execução. **Não houve teste físico em smartphone nesta entrega**; a matriz completa, câmera real, instalação, safe areas e suspensão de background permanecem itens obrigatórios antes de publicar.
