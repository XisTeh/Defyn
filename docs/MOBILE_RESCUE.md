# Mobile Rescue 06.1

> O estado atual do shell foi substituído pela reconstrução 06.2 descrita ao final deste documento. A seção 06.1 permanece como histórico da entrega anterior.

## Objetivo e limites

Esta etapa reconstrói a experiência mobile existente sem abrir módulos da etapa 07. Foram preservados os contratos de domínio, a separação por perfil, IndexedDB, backups, service worker, sessão/timer de treino e o comportamento desktop.

Não houve migration, alteração de schema ou dependência nova. As mudanças se concentram no shell, responsividade, captura local de imagens, revisão de OCR e ergonomia de toque.

## Bugs do QA físico tratados

- bottom nav instável, sobre conteúdo, formulários e sheets;
- CTAs finais inacessíveis e conflito com teclado virtual;
- títulos desktop quebrando palavras no telefone;
- Hoje, Progresso, Ficha e Treinos com composição de desktop espremida;
- câmera forçada na criação/edição de perfil, sem escolha explícita de galeria;
- entrada OCR imediata, lenta e sem preparação visual suficiente;
- parser misturando referências de porção, 100 g e `%VD` ou preenchendo revisão de forma pouco clara;
- modais com blur pesado, altura/scroll inadequados e disputa de camadas.

## Fundação mobile

- `AppShell` usa uma navegação inferior fixa e estável, sem botão central elevado.
- Alturas, safe areas, folga de conteúdo e camadas ficam centralizadas em tokens `--mobile-*` e `--z-*`.
- Quick actions e menu Mais são sheets com rolagem interna, fechamento por Escape, foco inicial e devolução de foco ao gatilho.
- A bottom nav é suprimida durante sheets, modais, sessão de treino e teclado virtual.
- `useMobileKeyboard` combina foco em elemento editável com a diferença entre `visualViewport.height` e a altura de layout. A regra tem testes puros e não depende de detecção por user agent.
- Cards e formulários usam `minmax(0, 1fr)`, `min-width: 0` e limites explícitos para não criar overflow por conteúdo intrínseco.

## Fotos

Foto de perfil, foto corporal e tabela nutricional apresentam ações separadas:

- **Tirar foto**, com `capture="user"` para avatar e `capture="environment"` para corpo/rótulo;
- **Escolher da galeria**, sem atributo `capture`;
- prévia e confirmação explícitas antes de persistir;
- processamento e armazenamento exclusivamente locais.

## OCR resgatado

O fluxo não inicia OCR ao selecionar o arquivo. Primeiro mostra a prévia e oferece rotação em quartos de volta, recorte central conservador e contraste opcional. Só a ação **Ler tabela** cria/reutiliza o worker português.

O parser trata rótulos brasileiros com vírgula ou ponto decimal, linhas quebradas e múltiplas colunas (`100 g`, porção declarada e `%VD`). A coluna por porção é priorizada quando declarada, mas a pessoa pode revisar ou escolher a referência de 100 g. Campos ausentes continuam ausentes; nenhum valor é inventado.

Uma tentativa local de desempenho, usando uma imagem PNG pequena apenas para cronometrar o pipeline, mediu: **0,33 s** no primeiro processamento (imagem 24 ms: decode 12 ms, ajuste 1 ms, WebP 11 ms; motor 0,10 s; leitura 0,20 s; parser 0,7 ms) e **0,19 s** na segunda tentativa com worker reutilizado (imagem 21 ms; motor 0 ms; leitura 0,17 s; parser 0,4 ms). Esses números não representam uma foto grande de rótulo em celular; o aparelho físico deve ser medido novamente.

## Ajustes por área

- Hoje: primeira dobra compacta, cards sem cortes e ações de água tocáveis.
- Diário: folha de adição de alimento com CTA visível e navegação inferior oculta.
- Ficha e metas: formulário em coluna, avatar com câmera/galeria e CTA com folga inferior.
- Progresso: título em uma linha, abas com scroll interno, KPIs em duas colunas e check-in como sheet sem overflow.
- Treinos: setup compacto, cards reduzidos e sessão ocupando a largura útil; a navegação Anterior/Próximo substitui a navegação global.
- Modais: altura em `dvh`, rodapé/cabeçalho sticky quando necessário e blur pesado removido no mobile.

## QA executado

Foi feito QA real no navegador local com viewport controlada:

| Família | Viewports | Resultado |
| --- | --- | --- |
| celulares | 320×800, 360×800, 375×812, 390×844, 430×932 | sem overflow do documento; bottom nav, sheets, formulário de check-in e sessão contidos |
| tablets | 768×1024, 820×1180, 1024×768 | breakpoints e largura do documento aprovados |
| desktop | 1280×800, 1920×1080 | sidebar de 276 px preservada; bottom nav oculta; sem overflow |

Também foram inspecionados: câmera/galeria por atributo, Quick actions, Diário, entrada OCR, Ficha, Progresso e início/retomada de sessão de treino.

Validação automatizada: lint e typecheck sem erros, **170 testes em 30 arquivos**, build PWA aprovado. O bundle principal ficou em **407,23 kB / 125,59 kB gzip**; o precache contém **77 entradas / 10.180,10 KiB**.

## Limites da validação

Não houve teste físico em smartphone. Câmera real, comportamento do teclado de cada sistema, safe areas de aparelhos com recorte, instalação, suspensão em segundo plano, wake lock e notificações ainda precisam de reteste manual em Android e iOS.

## Reconstrução 06.2

- a bottom nav, seus sheets e o hook de teclado dedicado a ocultá-la foram removidos;
- o mobile usa um drawer lateral único com todas as áreas, perfil ativo, troca/adição de pessoa, água rápida, Escape, overlay, armadilha e devolução de foco;
- botão compartilhado com variantes, estados de foco, disabled e loading foi introduzido para CTAs críticos;
- cabeçalhos mobile usam ritmo, padding e tipografia comuns;
- OCR abre em câmera/galeria/manual e só revela o formulário após leitura ou opção manual;
- Diário usa sheet alto com busca, resultados, resumo da seleção, quantidade, macros e CTA final;
- Home de Treinos cobre sem ficha, planejado, sessão ativa, concluído e descanso; sessão mostra progresso, descanso e próximo exercício;
- cards de exercício exibem ilustração e prescrição completa no mobile;
- sem migration, alteração de schema, dependência nova ou mudança nas regras de negócio.

QA no navegador: 320/360/375/390/430 e 1280/1440/1920 px, sem overflow horizontal do documento. Lint, typecheck, 178 testes em 33 arquivos e build PWA aprovados.

## Correções finais 06.3

- o acionador mobile agora é a área completa de avatar/nome; DEFYN fica à direita e não há hamburger;
- o drawer apresenta perfil atual uma vez, seguido de troca vertical com destaque/check, adição de pessoa e scroll próprio em `100dvh`;
- o editor OCR usa header fixo, body com `min-height: 0` e `overflow-y: auto`, e footer persistente com safe area;
- o editor de ficha mantém Adicionar e Salvar na mesma linha entre 320 e 430 px;
- dias de descanso permitem escolher qualquer template para uma sessão avulsa, sem modificar plano, agenda ou aderência planejada;
- sessão ativa continua vencendo descanso no Treinos e aparece como Continuar treino no Dashboard.

Não houve migration, mudança de backup, dependência nova ou alteração do domínio nutricional.
# Etapa 08

Durante sessão ativa, sidebar, drawer e cabeçalho móvel são ocultos pela classe `gym-mode-active`. A barra de sessão respeita `env(safe-area-inset-bottom)`, os campos usam `inputMode`/`enterKeyHint` e o conteúdo recebe espaço inferior suficiente para teclado e navegação fixa.
