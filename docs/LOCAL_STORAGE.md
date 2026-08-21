# Persistência local

O banco IndexedDB `defyn-local` é acessado exclusivamente por implementações em `src/infrastructure/indexed-db`.

## Versão 1

Perfis, targets, alimentos, receitas, diário, categorias, progresso, fotos/metadados e preferências.

## Versão 2

Adiciona `waterEntries` com índices `profileId`, `localDate`, composto `[profileId+localDate]` e `occurredAt`. A definição v1 permanece no código; v2 é uma migration incremental.

Durante o upgrade:

- perfis existentes preservam seus IDs e campos;
- é adicionada hidratação padrão configurável de `35 ml/kg` quando ausente;
- o antigo `isPrimary` é removido;
- o perfil principal v1, ou o primeiro disponível, vira `activeProfileId`;
- targets, diário e progresso já possuíam `profileId`, portanto não são recriados.

Exclusão de perfil e restauração de backup são transações Dexie. Uma falha aborta o conjunto e evita estado parcial.

## Versão 3

Mantém todas as stores anteriores e adiciona:

- `media`: `id, kind, ownerType, ownerId, createdAt`;
- `foodPreferences`: perfil/alimento, favorito, uso recente;
- `favoriteMeals`: refeições reutilizáveis por perfil.

`foods` passa a indexar `nameNormalized`, `searchTextNormalized`, `barcode` e `updatedAt`; diário ganha `[profileId+mealCategoryId]`. A migration popula busca/porções sem mudar IDs ou nutrientes e adiciona preferências opcionais/rotina de hidratação aos perfis. O banco nunca é apagado no upgrade.

## Versão 4

Adiciona `trainingProfiles`, `exercises` (somente próprios persistidos), `exerciseFavorites`, `workoutPlans`, `workoutSessions` e `workoutSetLogs`. Índices compostos cobrem perfil/status, perfil/data, perfil/exercício e sessão/exercício. A migration apenas cria as novas stores vazias e preserva integralmente as stores v3.

Sessões e séries são gravadas durante a execução, não apenas ao finalizar. `localDate` mantém o mesmo conceito de data local do diário/hidratação.

## Versão 5

Mantém as stores existentes e amplia índices de `progressRecords` e `progressPhotos` para data local, instante, categoria, mídia e check-in. Registros legados recebem `localDate`, `occurredAt`, origem `migration` e categoria normalizada a partir de `angle`; nenhum peso, medida ou identificador é removido.

O dashboard consulta diário/água/treino do perfil e dia; não carrega catálogos completos. As buscas percorrem somente os dados necessários.

Limpar os dados do site ainda remove o banco; por isso o backup manual deve ser usado antes de operações externas no navegador/dispositivo.

## Pressão e persistência

Backup consulta `navigator.storage.estimate()` quando disponível e classifica uso em normal, atenção (≥75%) ou crítico (≥90%). `persist()` é oferecido como pedido opcional; concessão depende do navegador e não substitui backup. Imagens pessoais continuam somente em `media`/IndexedDB, fora do service worker.
