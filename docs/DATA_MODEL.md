# Modelo de dados

## IndexedDB v8

- `RoutineProfile`: preferências de lembretes e estado de permissão por perfil.
- `RoutineDay`: `profileId + dayOfWeek`, horários opcionais e referência ao template de treino.
- `SleepRecord`: `profileId + localDate` com a data do despertar e duração factual.
- `ReminderSnooze`: `profileId + reminderKind` e validade do silêncio.

A cadeia v7 continua preservada. A migration v8 é estritamente aditiva e acrescenta `syncOutbox`, `syncMetadata`, `syncCursors` e `syncConflicts`; nenhum store anterior é removido.

## DailyNutritionSummary

Um registro no máximo por `profileId` + `localDate`:

```ts
interface DailyNutritionSummary {
  id: string;
  profileId: string;
  localDate: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

Campos são independentes. Ausência não equivale a zero; `0` é um valor explícito. Um resumo completamente vazio é removido.

## Entidades ativas

`UserProfile`, `NutritionTargetSnapshot`, `WaterEntry`, `ProgressRecord`, `ProgressPhotoMetadata`, `TrainingProfile`, `Exercise`, `WorkoutPlan`, `WorkoutSession`, `WorkoutSetLog`, `LocalMedia` e `DailyNutritionSummary`.

## Legado preservado

`Food`, `Recipe`, `DiaryEntry`, `MealCategory`, `FoodPreference` e `FavoriteMeal` continuam tipados e armazenados somente para compatibilidade. Não há conversão automática desses dados em resumo diário.
# Treino e integridade histórica

Rascunhos usam `WorkoutSetLog.completed = false`; ordem temporária usa `WorkoutSession.exercises`; descanso usa `restEndsAt`; nomes históricos permanecem em snapshots. A troca de perfil é bloqueada enquanto o perfil atual possui sessão ativa, evitando troca silenciosa de proprietário durante um treino.

## Modelo remoto da versão 1.1.0

`auth.users.id` é o ID da conta e também `accounts.id`. Um usuário autenticado pode possuir vários registros em `defyn_profiles`; cada perfil DEFYN mantém o UUID criado offline e não representa um login separado.

O schema remoto novo contém 15 tabelas: `accounts`, `defyn_profiles`, `account_preferences`, `profile_settings`, `nutrition_targets`, `nutrition_summaries`, `hydration_entries`, `routine_days`, `sleep_records`, `training_plans`, `workout_sessions`, `workout_sets`, `progress_records`, `check_ins` e `media_metadata`. Campos flexíveis do domínio ficam em `payload`/`measurements`, mas ownership, relações, datas de consulta e ciclo de sync permanecem em colunas próprias; não há blob único do IndexedDB.

`foods`, `recipes` e `diary_entries` não existem no Supabase. Esses domínios foram removidos do produto 1.0 e permanecem apenas nos stores IndexedDB/backup para compatibilidade histórica. O resumo nutricional manual atual é representado por `nutrition_summaries`; ele não depende de catálogo, receita, refeição ou OCR.

Registros sincronizáveis têm UUID, `account_id`, `profile_id` quando aplicável, `created_at`, `updated_at`, `deleted_at` e `revision`. FKs compostas `(account_id, profile_id)` impedem referências cruzadas entre contas. Tombstones preservam exclusões até que todos os dispositivos as observem.

Mapeamento local: `profiles → defyn_profiles`, perfil ativo → `account_preferences`, `trainingProfiles` + `routineProfiles → profile_settings`, metas/resumos/água/rotina/sono/fichas/sessões/séries para suas tabelas homônimas remotas, e `ProgressRecord.source === 'check-in'` para `check_ins`; demais registros corporais usam `progress_records`.

`media_metadata` representa avatar e foto de progresso com `id`, ownership, finalidade, `storage_path`, MIME, payload, timestamps, tombstone e revisão. O Blob permanece em `media` no IndexedDB e no objeto privado de Storage; nunca entra na linha PostgreSQL. `syncMetadata.remotePayload` guarda apenas o snapshot técnico necessário ao download lazy.
