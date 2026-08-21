export type NutritionErrorCode =
  | 'NOT_FINITE'
  | 'OUT_OF_RANGE'
  | 'INVALID_ACTIVITY_FACTOR'
  | 'INVALID_CALORIE_TARGET'
  | 'NEGATIVE_CARBOHYDRATES';

export class NutritionDomainError extends Error {
  constructor(
    public readonly code: NutritionErrorCode,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'NutritionDomainError';
  }
}
