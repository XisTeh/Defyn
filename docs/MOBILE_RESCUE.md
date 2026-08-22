# Mobile Rescue 06.1

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
