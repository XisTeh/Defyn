# Mobile e PWA

## Instalação

O manifest usa `id`, `start_url` e `scope` em `/`, nome completo do DEFYN, `display: standalone`, tema preto técnico, fundo cinza-claro e ícones PNG 192/512. O ícone maskable possui área segura própria.

Em navegadores com `beforeinstallprompt`, “Instalar DEFYN” só aparece depois do evento real. No iOS/iPadOS, a ação contextual explica **Compartilhar → Adicionar à Tela de Início**. Em modo standalone nenhuma chamada de instalação é mostrada.

## Atualizações

O service worker usa atualização por confirmação. Quando há versão nova, o shell oferece “Atualizar agora”. Antes de recarregar, consulta a sessão ativa do perfil; se houver treino em andamento, adia a atualização e preserva os registros persistidos.

## Layout e safe areas

Header, bottom navigation, sheets, sessão de treino e avisos consideram `env(safe-area-inset-top|bottom)`. Controles mobile usam alvos de pelo menos 42–48 px; entradas críticas do treino usam 52 px. Funcionalidade não depende de hover.

## Carregamento por demanda

Treinos, Progresso, o workspace de Alimentação/Receitas e Backup são rotas `React.lazy` com skeleton. Tesseract continua em import dinâmico dentro do fluxo OCR.

Build de referência antes desta etapa: bundle principal **519,87 kB / 156,45 kB gzip**. Depois do split: **403,32 kB / 124,22 kB gzip**, redução de 116,55 kB brutos e 32,23 kB gzip; os chunks funcionais ficam entre 9,85 e 52,94 kB. CSS também passou de um único arquivo de 145,76 kB para base de 75,28 kB e folhas por módulo.

## Limite de validação

O comportamento foi validado no navegador local a 1280 px, com inspeção dos breakpoints e roteiro da matriz responsiva. A ferramenta conectada não expôs redimensionamento de viewport nesta execução; a matriz completa e câmera, instalação, safe area, retomada em segundo plano e notificações ainda precisam de conferência física em Android/iOS e nos tamanhos listados em `MOBILE_QA.md`.
