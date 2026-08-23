# Mobile e PWA

O mobile usa cabeçalho compacto e drawer lateral acionado pelo perfil. As áreas ativas são Hoje, Diário, Treinos, Progresso, Rotina, Ficha e metas, Perfis e Backup.

## Atualização automática segura

`registerType: autoUpdate` ativa o worker novo e informa as janelas controladas. Não existe banner nem botão para confirmar versão. A página recarrega assim que é seguro.

O reload é adiado durante uma sessão de academia e enquanto houver um diálogo ou fluxo crítico marcado — edição de rotina, instalação iOS, arquivo de backup pendente/restauração. Um `MutationObserver` acompanha tanto atributos quanto inclusão/remoção de elementos; ao fechar o último bloqueador, a atualização pendente é aplicada sem ação extra do usuário.

## Offline e QA

O precache inclui aplicação, fontes, ícones e miniaturas de exercício; mídia pessoal continua no IndexedDB e não entra no cache do service worker. QA de layout cobre 320×800, 360×800, 375×812, 390×844, 430×932, 1280×800, 1440×900 e 1920×1080.
