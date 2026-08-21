# Fotos de progresso

## Fluxo local

Fotos podem vir da galeria ou da câmera quando suportada. O fluxo não força câmera traseira, mostra prévia e orientação textual para frente/lado/costas. `optimizeImage` valida JPEG/PNG/WebP até 20 MB, respeita orientação EXIF via `createImageBitmap`, limita o maior lado a 1600 px e converte para WebP comprimido. O resultado é salvo em `MediaRepository`; nenhuma rede participa.

`ProgressPhotoMetadata` guarda perfil, data local, categoria (`front`, `side`, `back`, `free`), `mediaId`, check-in opcional e auditoria. A imagem é carregada sob demanda com object URL revogada no cleanup do componente.

## Comparação

A comparação exige a mesma categoria e datas escolhidas pela pessoa. Ela apenas posiciona as imagens lado a lado. Não há alinhamento biométrico, segmentação, análise corporal, escore ou inferência por IA.

## Remoção e backup

Excluir foto exige confirmação e remove metadata e blob numa transação. Excluir perfil também inclui mídias de progresso no cascade. O backup v4 serializa a mídia necessária como data URL e valida a referência antes de restaurar.
