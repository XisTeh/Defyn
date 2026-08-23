# Armazenamento local

O banco `defyn-local` usa IndexedDB por Dexie, atualmente no schema v7. Todas as entidades pessoais carregam `profileId` e as consultas de interface filtram esse proprietário.

Além dos stores de treino, hidratação, progresso e mídia, v7 adiciona `routineProfiles`, `routineDays`, `sleepRecords` e `reminderSnoozes`. A migração é aditiva: nenhum store existente é removido.

`dailyNutritionSummaries` tem índice único `[profileId+localDate]`, garantindo no máximo um resumo por pessoa e dia. Ausência de campo não equivale a zero.

Fotos e avatares ficam como Blob otimizado em `media`; não são enviados para servidor. Dados alimentares antigos existem somente para compatibilidade de backup/migração e exclusão de perfil, fora da navegação ativa.
