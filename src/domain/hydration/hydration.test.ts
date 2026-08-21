import { describe, expect, it } from 'vitest';
import {
  calculateHydrationTarget,
  HydrationDomainError,
  sumWaterEntries,
  validateWaterAmount,
  type WaterEntry,
} from './hydration';

describe('motor de hidratação', () => {
  it.each([[30, 2400], [35, 2800], [40, 3200]])('calcula %i ml/kg', (mlPerKg, expected) => {
    expect(calculateHydrationTarget(80, { mode: 'weight-based', mlPerKg })).toBe(expected);
  });

  it('aceita meta personalizada', () => {
    expect(calculateHydrationTarget(80, { mode: 'custom', customTargetMl: 2750 })).toBe(2750);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejeita peso inválido %s', (weight) => {
    expect(() => calculateHydrationTarget(weight, { mode: 'weight-based', mlPerKg: 35 })).toThrow(HydrationDomainError);
  });

  it('rejeita ml/kg e meta manual inválidos', () => {
    expect(() => calculateHydrationTarget(80, { mode: 'weight-based', mlPerKg: 0 })).toThrow(HydrationDomainError);
    expect(() => calculateHydrationTarget(80, { mode: 'custom', customTargetMl: Number.NaN })).toThrow(HydrationDomainError);
  });

  it('mantém precisão sem arredondamento prematuro', () => {
    expect(calculateHydrationTarget(77.7, { mode: 'weight-based', mlPerKg: 35 })).toBeCloseTo(2719.5, 10);
  });

  it('agrega registros do dia', () => {
    expect(sumWaterEntries([entry('a', 300), entry('b', 450), entry('c', 500)])).toBe(1250);
  });

  it('valida quantidades registradas', () => {
    expect(() => validateWaterAmount(450)).not.toThrow();
    expect(() => validateWaterAmount(0)).toThrow(HydrationDomainError);
    expect(() => validateWaterAmount(Number.POSITIVE_INFINITY)).toThrow(HydrationDomainError);
  });
});

function entry(id: string, amountMl: number): WaterEntry {
  return { id, profileId: 'p1', amountMl, localDate: '2026-08-21', occurredAt: '2026-08-21T12:00:00.000Z', createdAt: '2026-08-21T12:00:00.000Z', updatedAt: '2026-08-21T12:00:00.000Z' };
}
