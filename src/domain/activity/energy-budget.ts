/**
 * Domain rule: a TDEE based on an activity factor already includes the user's
 * typical exercise. Workout calories must not be added to the daily budget
 * unless a future calculation explicitly switches to a sedentary baseline.
 */
export const WORKOUT_ENERGY_BUDGET_RULE = 'activity-factor-includes-typical-exercise' as const;
