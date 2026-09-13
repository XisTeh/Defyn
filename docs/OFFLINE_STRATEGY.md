# Estratégia offline

O build precacheia o shell HTML/CSS/JS, chunks lazy, fontes, ícones PWA e 241 miniaturas de exercícios. `cleanupOutdatedCaches` remove gerações antigas e o fallback de navegação usa `index.html`.

Mídia pessoal não entra no Workbox: fotos baixadas ficam como Blob no IndexedDB. Avatar é priorizado no primeiro pull; fotos recentes baixam com concorrência limitada e o histórico é solicitado sob demanda. Depois do cache, todas abrem offline. Assets OCR, modelo de idioma, worker e wasm foram removidos na Etapa 07.

`sw-auto-update.js` ativa a nova versão e renavega clientes controlados após troca de deployment, sem banner ou confirmação manual. O sync sincroniza registros e mídia quando o app está aberto; não depende de Background Sync API nem promete execução contínua com o app fechado.
# Modo Academia offline

O chunk de Treinos e as imagens da biblioteca fixa integram o precache. Sessão, rascunhos, logs e `restEndsAt` vivem no IndexedDB; portanto, fechar/reabrir ou perder conexão não elimina o estado operacional.

O sync é secundário à persistência local: grava primeiro no IndexedDB/outbox, tenta enviar após mutações, no bootstrap, reconexão, foco e a cada 60 segundos. Falhas usam backoff de 2 segundos até 5 minutos, sem descartar a fila. Estados: sincronizado, sincronizando, offline com alterações pendentes, conflito e erro mantendo dados no dispositivo.

Sessão ativa local nunca é substituída durante pull; divergência vira conflito. Ao finalizar offline, sessão e séries sobem em ordem topológica e o UUID estável impede duplicação.
