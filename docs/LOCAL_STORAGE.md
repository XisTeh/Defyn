# Armazenamento local

O banco `defyn-local` usa IndexedDB por Dexie, atualmente no schema v9. Todas as entidades pessoais carregam `profileId` e as consultas de interface filtram esse proprietário.

Além dos stores de treino, hidratação, progresso e mídia, v7 adiciona `routineProfiles`, `routineDays`, `sleepRecords` e `reminderSnoozes`. A migração é aditiva: nenhum store existente é removido.

`dailyNutritionSummaries` tem índice único `[profileId+localDate]`, garantindo no máximo um resumo por pessoa e dia. Ausência de campo não equivale a zero.

Fotos e avatares ficam como Blob otimizado em `media`. Quando a conta opta pela sincronização, uma cópia privada usa Storage e `media_metadata`; o Blob local continua sendo a fonte da UI e permite uso offline. Dados alimentares antigos existem somente para compatibilidade de backup/migração e exclusão de perfil, fora da navegação ativa e da cloud.

## Stores técnicas da 1.1.1

`syncOutbox` preserva UPSERT/DELETE até confirmação remota; `syncMetadata` guarda estado e revisão; `syncCursors` mantém `(updated_at,id)` por tabela/conta; `syncConflicts` preserva as duas versões. Essas stores não aparecem na UI de domínio nem no backup v7.

A preferência técnica `localOwnerAccountId` guarda o UUID da conta Supabase que reivindicou os dados desta instalação. `sync:enrollmentAccountId` só é criado em instalação vazia ou após confirmação do bootstrap. Ambas ficam fora do backup.

Dados legacy sem owner não são abertos silenciosamente: o usuário precisa confirmar o vínculo. Uma conta diferente recebe uma tela neutra e não acessa snapshots, perfis ou mídia. Logout preserva owner e conteúdo. O reset protegido limpa todas as preferências, incluindo o owner; se a sessão atual continuar autenticada, a instalação vazia é reivindicada novamente antes de reabrir o app.

A 1.1.1 adiciona a migration local v8 → v9 sem remover stores. Ela converte IDs compostos antigos de `routineDays` em UUIDs e remapeia, na mesma transação, `syncOutbox`, `syncMetadata` e `syncConflicts`. Conteúdo, `profileId`, dia e horários são preservados; operações pendentes continuam aptas a retry.

O reset limpa domínio, fila, metadata, cursores, conflitos e owner local numa única transação; não executa DELETE no Supabase. Restaurar backup limpa metadata de sync e exige novo bootstrap explícito, evitando tratar conteúdo restaurado como já enviado.

A sessão Supabase usa o storage padrão do cliente com a chave de namespace `defyn-auth`; tokens são gerenciados pela biblioteca, nunca impressos ou copiados para registros do domínio. Dados pessoais operacionais continuam no IndexedDB.
