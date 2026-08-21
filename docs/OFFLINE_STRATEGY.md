# Estratégia offline

## Precache

O build inclui shell HTML/CSS/JS, chunks lazy, ícones, miniaturas locais dos exercícios e os três ativos OCR. `cleanupOutdatedCaches` remove gerações antigas. O fallback de navegação volta para `index.html`.

O precache de referência possui **77 entradas e 10,15 MB**. Aproximadamente 5,4 MB pertencem ao OCR local e cerca de 4,3 MB às 52 miniaturas. Esse custo é deliberado para tornar OCR e treino ilustrado disponíveis após a primeira instalação/carga concluída.

## Dados pessoais

Perfis, diário, treino, fotos e mídia pessoal vivem no IndexedDB. URLs `blob:`/`data:` e mídia pessoal não entram no precache. Limpar os dados do site remove o banco; o backup manual continua obrigatório.

## Estado de conexão

O indicador usa eventos `online/offline` reais. “Offline disponível” significa que o service worker informou `onOfflineReady`; não afirma que a primeira instalação incompleta já esteja cacheada.

Não há fila de sincronização nem backend. Toda escrita funcional já é local e transacional; portanto não existe operação de rede a reenviar.
