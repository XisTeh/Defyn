# Mobile e PWA

O mobile usa cabeçalho compacto e drawer lateral acionado pelo perfil. As áreas são Hoje, Diário, Treinos, Progresso, Ficha e metas, Perfis e Backup.

## Atualização

`registerType: autoUpdate` verifica novas versões. `public/sw-auto-update.js` ativa o worker novo e avisa as janelas controladas. Não existe banner ou botão “Atualizar agora”. A janela recarrega imediatamente quando segura; durante o Modo Academia, aguarda a saída da sessão para não interromper série, rascunho ou descanso.

## Offline

O precache inclui HTML, JavaScript, CSS, fontes, ícones e 52 miniaturas de exercícios. Não inclui mídia pessoal nem assets OCR. Fotos continuam acessíveis via IndexedDB.

Viewports obrigatórios de QA: 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800, 1440×900 e 1920×1080.
