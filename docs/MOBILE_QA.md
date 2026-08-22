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

QA com viewport controlada foi executado em 320×800, 360×800, 375×812, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 1280×800 e 1920×1080.

Resultados observados:

- documento sem overflow horizontal em todos os tamanhos;
- navegação inferior fixa dentro da área útil no mobile e ausente no desktop;
- sidebar desktop preservada com 276 px em 1280 e 1920;
- Quick actions, adição de alimento, entrada OCR e check-in terminando no fundo da viewport e ocultando a bottom nav;
- check-in corporal de 320 px sem extravasamento de campos ou rodapé;
- sessão de treino de 320 px sem corte do card, inputs ou navegação Anterior/Próximo;
- abas de Progresso rolam internamente nas larguras em que não cabem;
- entradas de arquivo inspecionadas: avatar `capture=user`, corpo/rótulo `capture=environment` e galeria sem `capture`.

Lint, typecheck, **170 testes em 30 arquivos** e build PWA estão aprovados. **Não houve teste físico em smartphone nesta entrega**; câmera real, teclado de Android/iOS, instalação, safe areas, suspensão de background, wake lock e notificações permanecem obrigatórios antes de publicar.
