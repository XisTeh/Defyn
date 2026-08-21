# Backup e restauração

## Formato

JSON com `format: "defyn-backup"`, `version: 4`, `exportedAt` e `data`. Inclui perfis, targets, alimentos, receitas, diário, categorias, água, favoritos, progresso corporal, fotos, preferências, perfil de treino, exercícios próprios, fichas/versionamento, sessões, séries e mídia necessária em data URL base64.

Arquivos usam o nome `defyn-backup-AAAA-MM-DD.json`, baseado no dia local.

## Validação

Antes de gravar, o parser confirma JSON válido, formato, versão, todas as coleções, estrutura mínima de perfis, referências de perfil, check-in e mídia, números corporais finitos e referência válida de `activeProfileId`. JSON arbitrário ou versões futuras são rejeitados com mensagem clara.

## Estratégia

A restauração v4 é completa e transacional. Não há merge inteligente. A interface apresenta conteúdo validado e exige segunda ação. Backups v1, v2 e v3 são reconhecidos; progresso legado recebe data local, instante, origem e categoria antes da validação. Versões futuras são rejeitadas.

O JSON portátil foi mantido no formato v4 porque toda mídia persistida é comprimida no dispositivo. Base64 aumenta o trecho de mídia em aproximadamente 33%; se a galeria crescer muito, a evolução indicada é ZIP com manifest, dados e pasta de mídia. Caches de OCR, thumbnails regeneráveis e workers não entram no backup.

O arquivo é criado e lido no próprio dispositivo; não é enviado a servidor.

Antes do download/compartilhamento, o JSON recém-gerado passa novamente pelo parser de integridade. Web Share com arquivos é oferecido somente quando `navigator.canShare({files})` confirma suporte; download permanece fallback. A tela também apresenta estimativa de armazenamento e pedido opcional de persistência.
