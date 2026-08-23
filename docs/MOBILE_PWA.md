# Mobile e PWA

O mobile usa cabeçalho compacto e drawer lateral acionado pelo perfil. As áreas são Hoje, Diário, Treinos, Progresso, Ficha e metas, Perfis e Backup.

## Atualização

`registerType: autoUpdate` verifica novas versões. `public/sw-auto-update.js` ativa o worker novo e renavega as janelas controladas quando a versão muda. Não existe banner ou botão “Atualizar agora”. Uma sessão de treino persiste no IndexedDB e pode ser retomada após a navegação.

## Offline

O precache inclui HTML, JavaScript, CSS, fontes, ícones e 52 miniaturas de exercícios. Não inclui mídia pessoal nem assets OCR. Fotos continuam acessíveis via IndexedDB.

Viewports obrigatórios de QA: 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800, 1440×900 e 1920×1080.
