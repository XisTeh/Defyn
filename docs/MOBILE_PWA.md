# Mobile e PWA

O mobile usa cabeçalho compacto e drawer lateral acionado pelo perfil. As áreas ativas são Hoje, Diário, Treinos, Progresso, Rotina, Ficha e metas, Perfis e Backup.

## Atualização automática segura

`registerType: autoUpdate` ativa o worker novo e informa as janelas controladas. Não existe banner nem botão para confirmar versão. A página recarrega assim que é seguro.

O reload é adiado durante sessão de academia, sync crítico, bootstrap inicial, conflito e demais fluxos marcados — edição de rotina, instalação iOS, arquivo de backup pendente/restauração. Um `MutationObserver` acompanha atributos e inclusão/remoção de elementos; ao fechar o último bloqueador, a atualização pendente é aplicada.

## Offline e QA

O precache inclui aplicação, fontes, ícones e miniaturas de exercício; mídia pessoal continua no IndexedDB e não entra no cache do service worker. Download de mídia é lazy e autenticado, com cache Blob offline. QA de layout cobre 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800, 1366×768, 1440×900 e 1920×1080.

O status de sync aparece discretamente no rodapé da sidebar e na seção Conta do drawer. Diálogos de conflito, logout pendente e bootstrap usam largura fluida e ações empilháveis nas menores telas.
