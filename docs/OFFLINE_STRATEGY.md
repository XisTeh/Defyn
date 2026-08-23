# Estratégia offline

O build precacheia o shell HTML/CSS/JS, chunks lazy, fontes, ícones PWA e 52 miniaturas de exercícios. `cleanupOutdatedCaches` remove gerações antigas e o fallback de navegação usa `index.html`.

Mídia pessoal não entra no Workbox: fotos ficam no IndexedDB. Assets OCR, modelo de idioma, worker e wasm foram removidos na Etapa 07.

`sw-auto-update.js` ativa a nova versão e renavega clientes controlados após troca de deployment, sem banner ou confirmação manual. O DEFYN continua sem prometer sincronização entre dispositivos ou execução confiável de lembretes em segundo plano.
