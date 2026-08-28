# Media Sync 1.1.0

## Escopo e privacidade

Avatar e fotos de progresso usam exclusivamente o bucket privado `defyn-media`. Assets do aplicativo, ícones, miniaturas de exercícios, OCR e mídia dos domínios alimentares legados não participam deste fluxo. O frontend usa somente a sessão autenticada e a publishable key; nunca existe `service_role` no navegador.

O caminho persistente é `<account_id>/<profile_id>/<media_id>.<ext>`. `account_id` vem da sessão, IDs são UUIDs estáveis e a extensão deriva do MIME validado. Nomes originais e signed URLs nunca são persistidos. JPEG, PNG e WebP são aceitos; SVG e conteúdo cuja assinatura não corresponda ao MIME são recusados.

## Upload local-first

O navegador orienta, reduz e converte a imagem para a representação otimizada atual, salva o Blob em `media` e grava a operação `media_metadata` na outbox v8. A interface considera a foto salva nesse ponto. O upload posterior envia o objeto privado antes de confirmar a metadata remota. Retry usa o mesmo path; se o objeto já existir, tamanho, MIME e conteúdo válido são confirmados sem criar outro objeto.

`media_metadata.payload` preserva dimensões, tamanho, finalidade, owner local e, para progresso, a metadata visual necessária. O Blob nunca entra em JSON, `syncMetadata` ou `media_metadata`.

## Download e cache offline

O pull incremental materializa a metadata antes de baixar o binário. Avatares têm prioridade no primeiro acesso. Fotos recentes são baixadas em background limitado e fotos históricas são solicitadas sob demanda pela tela. Downloads concorrentes são limitados a três.

Antes do cache, o DEFYN valida tamanho, MIME e assinatura do arquivo. O Blob aprovado é salvo no IndexedDB e passa a abrir offline por object URL local. Mídia pessoal não entra no Service Worker nem no precache.

Falha de quota não remove arquivos. A UI informa que não foi possível manter a foto offline; a cópia privada continua disponível para nova tentativa.

## Exclusão e retry

Ao excluir, a referência visual some localmente e uma operação `DELETE` preserva `storagePath`. O worker remove primeiro o objeto e depois confirma o tombstone de `media_metadata`, evitando perder o endereço necessário. Repetir DELETE de objeto já ausente é sucesso idempotente. O Blob local mantido apenas para retry é removido após confirmação.

Outro dispositivo recebe o tombstone, remove metadata visual e cache local. Não há garbage collector agressivo; o fluxo normal não deixa objeto órfão.

## Backup

Backup manual continua no formato v7 e inclui os Blobs otimizados. Sync e backup são independentes: restore cria estado local e limpa metadata técnica; um novo consentimento passa os dados restaurados pelo merge normal, sem sobrescrever a nuvem silenciosamente.
