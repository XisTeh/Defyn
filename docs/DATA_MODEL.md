# Modelo de dados

## Etapa 09 / IndexedDB v7

- `RoutineProfile`: preferências de lembretes e estado de permissão por perfil.
- `RoutineDay`: `profileId + dayOfWeek`, horários opcionais e referência ao template de treino.
- `SleepRecord`: `profileId + localDate` com a data do despertar e duração factual.
- `ReminderSnooze`: `profileId + reminderKind` e validade do silêncio.

A migração é estritamente aditiva sobre v6.

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
