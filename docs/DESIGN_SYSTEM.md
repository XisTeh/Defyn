# Design system

O DEFYN usa uma base neutra inspirada no Puzoto Design: canvas cinza-claro, navegação em preto técnico, tipografia de alto contraste, vidro translúcido e linhas arquitetônicas muito finas. Cores semânticas aparecem somente quando ajudam a interpretar dados, estados ou ações. A aplicação preserva a própria arquitetura e não carrega o template em runtime.

## Paleta e superfícies

Os tokens vivem em `src/shared/styles/tokens.css`:

- `--background` usa cinza frio (`#e7eaec`), sem branco puro;
- `--surface-1`, `--surface-2` e `--surface-3` formam a profundidade clara;
- `--surface-glass` e `--surface-glass-strong` representam vidro claro translúcido;
- `--surface-light` e `--surface-light-elevated` criam cartões cinza-gelo de alto contraste;
- `--text-primary`, `--text-secondary` e `--text-muted` definem branco, prata e cinza;
- `--accent`, `--accent-strong` e `--accent-soft` usam prata fria, sem bronze ou verde de marca;
- `--water` usa azul como semântica de hidratação;
- `--macro-protein` usa coral, `--macro-carbs` usa violeta e `--macro-fat` usa âmbar/laranja;
- `--success`, `--warning`, `--danger` e `--info` representam estados positivos, atenção, erro e informação;
- cada cor semântica possui uma variante `-soft` para fundos e rings discretos.

Cor nunca é o único identificador: pontos, barras e mensagens permanecem acompanhados por rótulos, valores ou ícones.

`MacroLegend` permanece disponível para resumos compactos de P/C/G. No produto atual, o Diário usa campos manuais independentes e o dashboard apresenta metas e valores informados sem depender de alimentos.

O fundo combina grid de 74 px, pontos raros, luz difusa e ruído de baixa opacidade. Escudos concêntricos e anéis gravados reinterpretam as referências greco-espartanas e vikings como marca d’água. Nenhum desses elementos interfere em hit testing ou leitura.

## Distribuição de material

A maior parte da interface usa vidro claro com `backdrop-filter`, borda grafite entre 10% e 22% e sombra fria curta. Superfícies escuras aparecem somente onde o contraste ajuda a leitura:

- energia diária no Dashboard;
- resumo manual do Diário e metas nutricionais;
- painel de estimativas da Ficha;
- exportação no Backup;
- botões primários e estados selecionados de alta importância.

Essa distribuição evita uma massa preta plana, melhora leitura e manipulação e mantém a aparência técnica da referência.

## Tipografia e cabeçalhos

Títulos usam a família condensada, `clamp()`, `overflow-wrap` e `text-wrap: balance`. Eyebrow, título e descrição permanecem no fluxo normal com `gap` real; elementos orbitais ficam em pseudo-elementos fora da camada de texto.

## Sidebar e mobile

A arquitetura aprovada da sidebar permanece: rail de 276 px, perfil no topo, ação principal, navegação agrupada e rodapé local-first. O material agora é vidro preto com blur de 22 px. O item ativo usa linha prata e preenchimento translúcido; a ação principal usa cinza-gelo.

No mobile, header e bottom navigation usam o mesmo vidro escuro e respeitam safe area. A navegação inferior não possui recorte ou botão elevado, mantém altura estável e desaparece durante teclado, sheets, modais e sessão de treino. Sheets usam backdrop escuro sem blur pesado, `dvh`, rolagem interna e bordas superiores arredondadas.

Instalação, atualização, estado offline e recursos de dispositivo reutilizam os mesmos materiais. Ações impossíveis são ocultadas; alternativas e estados negados são descritos em texto. Sessão de treino eleva inputs e conclusão de série para 52 px em telas estreitas.

## Cards, formulários e modais

Cards usam gradiente transparente de 1% a 3,4%, borda hairline e elevação curta no hover. Inputs usam branco a 4,5% e focus prata. Modais e listboxes usam superfície quase opaca com blur suficiente para separar conteúdo sem perder o contexto.

Alertas destrutivos usam vermelho apenas no ponto de decisão. Avisos usam âmbar, informações usam azul e estados concluídos/offline usam verde. Essas cores não substituem a identidade neutra nem ocupam grandes superfícies.

## Select DEFYN

`DefynSelect` continua acessível, controlado e montado em portal acima de modais. As variantes `light` e `dark` permanecem por compatibilidade estrutural, mas compartilham o mesmo material monocromático. Em telas estreitas, o listbox vira sheet inferior.

## Movimento e acessibilidade

Motion usa os tokens `--motion-*`, `--ease-standard`, `--ease-out` e `--ease-silk`. Cards respondem por escala discreta e sombra em 720 ms, sem salto vertical, e retornam com a mesma curva suave; botões animam cor, borda, sombra e pressão sem clarões. Progressos animam até o valor; sheets e modais entram uma vez. Efeitos de hover só são aplicados em dispositivos com ponteiro fino, e `prefers-reduced-motion` reduz animações globalmente.

Treinos reutiliza superfícies claras e cards dark estratégicos. Fallbacks de exercício recebem cores semânticas por grupo muscular, sempre acompanhadas por abreviação/rótulo. A sessão prioriza touch targets, inputs numéricos, timer persistente e safe areas.

Foco é sempre visível, textos secundários usam contraste próprio e a escala z-index é centralizada. Componentes mantêm `minmax(0, 1fr)`, `min-width: 0`, wrapping e breakpoints para evitar overflow na origem. Em 320 px, cabeçalhos importantes permanecem legíveis, abas longas rolam horizontalmente dentro do próprio componente e CTAs sticky conservam a safe area.

## Referências visuais

As capturas do Puzoto e as imagens clássicas fornecidas orientam atmosfera, contraste, transparência e geometria. Nenhuma foi copiada para o bundle: não há custo adicional no PWA nem dependência de `templates/`.
# Adendo 06.2 — controles e navegação mobile

- `Button` é o componente compartilhado para CTAs primários, secundários, ghost, danger e icon; preserva foco visível, loading e disabled.
- O shell mobile usa somente drawer lateral. A sidebar continua sendo o padrão desktop.
- Cabeçalhos mobile compartilham `--page-padding-mobile`, `--section-gap-mobile`, `--mobile-page-title-size` e escalas de corpo/caption.
- Sheets usam altura em `dvh`, rolagem interna, CTA final e safe area inferior.

# Adendo 06.3 — header, drawer e ações persistentes

- O header mobile tem duas zonas: perfil/avatar clicável à esquerda e DEFYN à direita. Não há hamburger ou segundo acionador.
- O drawer separa o resumo do perfil atual da lista vertical de troca e aplica rolagem interna independente.
- Formulários longos em sheet usam grid `header / minmax(0,1fr) / footer`; apenas o body rola e o footer considera safe area.
- No editor de treino, ação secundária e ação primária permanecem horizontais de 320 a 430 px, com maior peso para salvar.
