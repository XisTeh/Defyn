# Armazenamento local

O banco `defyn-local` usa IndexedDB por Dexie. A versão 6 adiciona, sem remover stores anteriores:

```text
dailyNutritionSummaries: id, profileId, localDate, &[profileId+localDate]
```

O índice composto único assegura um resumo por pessoa/data. Consultas de Diário e Progresso sempre incluem `profileId`; consultas históricas usam intervalo de `localDate`.

Stores de alimentos, receitas e diário antigo continuam existentes. O app não os enumera durante navegação normal. Eles só participam de migration, backup/restauração e exclusão explicitamente confirmada de um perfil.

Mídia genérica de perfil e progresso permanece em `media` como Blob otimizado. Nenhuma mídia é enviada para servidor.
# Modo Academia

O estado operacional não depende de memória React: sessão, índice atual, ordem temporária, nota, rascunhos de série, logs e fim do descanso são persistidos nas tabelas existentes do IndexedDB. `localStorage` não é usado para o domínio de treino.
