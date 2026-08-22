# Capacidades do dispositivo

`src/platform/device-capabilities.ts` centraliza detecção sem assumir que uma API existe.

| Capacidade | Detecção | Ação |
| --- | --- | --- |
| câmera | contexto seguro + `mediaDevices` ou plataforma mobile | mostra câmera frontal para avatar, traseira para corpo/rótulo; galeria permanece ação separada |
| instalação | `beforeinstallprompt`, iOS e standalone | prompt real, ajuda iOS ou ação oculta |
| notificações | `Notification` | solicitação somente após toque durante treino |
| wake lock | `navigator.wakeLock` | opt-in por sessão; tenta retomar ao voltar visível |
| armazenamento | `navigator.storage.estimate/persist` | mostra uso, pressão e pedido opcional de persistência |
| compartilhamento | Web Share + `canShare(files)` | compartilha backup; download é fallback |

Permissões negadas não quebram a tarefa principal. O DEFYN explica o bloqueio e mantém fallback disponível. Notificações e wake lock não prometem execução confiável com o app suspenso.

APIs de câmera exigem contexto seguro. `localhost` é confiável no próprio aparelho; um IP HTTP na rede local pode não ser. QA físico deve usar HTTPS confiável ou PWA instalada.

No HTML, avatar usa `capture="user"`; check-in, foto de progresso e tabela nutricional usam `capture="environment"`. Os inputs de galeria não recebem `capture`, evitando abrir a câmera à força.
