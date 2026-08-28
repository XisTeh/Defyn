import {
  hasDailyNutritionContent,
  validateDailyNutritionValues,
  type DailyNutritionSummary,
  type DailyNutritionValues,
} from '../../domain/nutrition-summary/daily-nutrition-summary';
import type { DailyNutritionSummaryRepository } from '../../domain/nutrition-summary/repository';
import { createUuid } from '../../shared/ids/create-uuid';

export function parseOptionalBrazilianDecimal(value: string): number | undefined {
  const compact = value.trim().replace(/\s/g, '');
  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Informe um número válido maior ou igual a zero.');
  return parsed;
}

export class DailyNutritionSummaryService {
  constructor(
    private readonly repository: DailyNutritionSummaryRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = createUuid,
  ) {}

  get(profileId: string, localDate: string) {
    return this.repository.get(profileId, localDate);
  }

  listByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string) {
    return this.repository.listByPeriod(profileId, startLocalDate, endLocalDate);
  }

  async save(profileId: string, localDate: string, values: DailyNutritionValues): Promise<DailyNutritionSummary | undefined> {
    validateDailyNutritionValues(values);
    const existing = await this.repository.get(profileId, localDate);
    if (!hasDailyNutritionContent(values)) {
      if (existing) await this.repository.remove(profileId, localDate);
      return undefined;
    }
    const timestamp = this.now().toISOString();
    const summary: DailyNutritionSummary = {
      id: existing?.id ?? this.id(),
      profileId,
      localDate,
      caloriesKcal: values.caloriesKcal,
      proteinG: values.proteinG,
      carbohydratesG: values.carbohydratesG,
      fatG: values.fatG,
      note: values.note?.trim() || undefined,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(summary);
    return summary;
  }
}
