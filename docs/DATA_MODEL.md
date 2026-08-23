# Modelo de dados

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
# Sem migração na Etapa 08

O schema permanece na versão 6. Rascunhos usam `WorkoutSetLog.completed = false`; ordem temporária usa `WorkoutSession.exercises`; descanso usa `restEndsAt`; nomes históricos permanecem em snapshots. Nenhum campo novo foi necessário.
