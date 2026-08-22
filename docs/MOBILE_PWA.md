# Mobile e PWA

## Instalação

O manifest usa `id`, `start_url` e `scope` em `/`, nome completo do DEFYN, `display: standalone`, tema preto técnico, fundo cinza-claro e ícones PNG 192/512. O ícone maskable possui área segura própria.

Em navegadores com `beforeinstallprompt`, “Instalar DEFYN” só aparece depois do evento real. No iOS/iPadOS, a ação contextual explica **Compartilhar → Adicionar à Tela de Início**. Em modo standalone nenhuma chamada de instalação é mostrada.

## Atualizações

O service worker detecta a nova versão e a aplica imediatamente, sem banner, pergunta ou botão manual. `registerType: autoUpdate` habilita `skipWaiting`/`clientsClaim`; um script carregado pelo próprio worker identifica quando já havia uma versão ativa e, ao ativar o update, renavega todas as janelas abertas para carregar os assets do novo deploy.

Essa renavegação parte do worker novo e não depende do JavaScript antigo nem de interação da pessoa. O primeiro registro não força uma navegação extra. Dados já persistidos continuam no IndexedDB e o shell offline permanece precacheado.

## Layout e safe areas

Header, bottom navigation, sheets, sessão de treino e avisos consideram `env(safe-area-inset-top|bottom)`. A navegação inferior tem geometria fixa, é suprimida por sheets/modais/sessão e também quando `visualViewport` indica teclado virtual sobre um campo editável. Controles mobile usam alvos de pelo menos 42–48 px; entradas críticas do treino usam 52 px. Funcionalidade não depende de hover.

Sheets usam altura baseada em `dvh`, rolagem interna, foco inicial, Escape e devolução do foco ao gatilho. A escala de camadas é centralizada em tokens para evitar disputa entre decoração, header, navegação, overlay, sheet, modal, toast e listbox.

## Carregamento por demanda

Treinos, Progresso, o workspace de Alimentação/Receitas e Backup são rotas `React.lazy` com skeleton. Tesseract continua em import dinâmico dentro do fluxo OCR.

Build de referência antes desta etapa: bundle principal **519,87 kB / 156,45 kB gzip**. Depois do split: **403,32 kB / 124,22 kB gzip**, redução de 116,55 kB brutos e 32,23 kB gzip; os chunks funcionais ficam entre 9,85 e 52,94 kB. CSS também passou de um único arquivo de 145,76 kB para base de 75,28 kB e folhas por módulo.

## Limite de validação

O comportamento é validado no navegador local nos viewports 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800 e 1920×1080. Câmera, teclado, instalação, safe area, atualização efetiva entre duas releases e suspensão ainda precisam de conferência física em Android/iOS. Detalhes: `MOBILE_RESCUE.md` e `MOBILE_QA.md`.
