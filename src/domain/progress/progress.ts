import type { AuditedEntity, IsoDate } from '../shared/types';
import { toLocalDateKey } from '../shared/local-date';

export type WeightSource = 'manual' | 'profile-update' | 'future-health-integration';
export type ProgressEntrySource = WeightSource | 'check-in' | 'migration';
export type ProgressPhotoCategory = 'front' | 'side' | 'back' | 'free';
export type ProgressPeriodPreset = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

export interface BodyMeasurements {
  waistCm?: number; abdomenCm?: number; chestCm?: number; hipCm?: number; neckCm?: number;
  leftArmCm?: number; rightArmCm?: number; leftThighCm?: number; rightThighCm?: number;
  leftCalfCm?: number; rightCalfCm?: number; bodyFatPercent?: number;
  custom?: Record<string, number>;
  /** Campos legados preservados pela migration v5. */
  armCm?: number; thighCm?: number;
}

export interface ProgressRecord extends AuditedEntity {
  profileId: string; localDate: IsoDate; occurredAt: string; weightKg?: number;
  weightSource?: WeightSource; measurements?: BodyMeasurements; note?: string;
  source: ProgressEntrySource;
  /** Chave v1–v4 mantida apenas para importação compatível. */
  date?: IsoDate;
}

export interface ProgressPhotoMetadata extends AuditedEntity {
  profileId: string; localDate: IsoDate; occurredAt: string; category: ProgressPhotoCategory;
  mediaId?: string; checkInId?: string; note?: string;
  /** Campos v1–v4. */
  date?: IsoDate; angle?: string; linkedWeightKg?: number; localFileRef?: string;
}

export interface ProgressPeriod { startLocalDate?: IsoDate; endLocalDate: IsoDate; preset: ProgressPeriodPreset; }

export const PROGRESS_PERIOD_LABELS: Record<ProgressPeriodPreset, string> = {
  '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', '6m': '6 meses', '1y': '1 ano', all: 'Tudo',
};

export const MEASUREMENT_LABELS: Record<string, string> = {
  waistCm: 'Cintura', abdomenCm: 'Abdômen', chestCm: 'Peito / tórax', hipCm: 'Quadril', neckCm: 'Pescoço', leftArmCm: 'Braço esquerdo', rightArmCm: 'Braço direito', leftThighCm: 'Coxa esquerda', rightThighCm: 'Coxa direita', leftCalfCm: 'Panturrilha esquerda', rightCalfCm: 'Panturrilha direita', bodyFatPercent: 'Gordura corporal informada', armCm: 'Braço (legado)', thighCm: 'Coxa (legado)',
};

export function createProgressPeriod(preset: ProgressPeriodPreset, end = new Date()): ProgressPeriod {
  const endLocalDate = toLocalDateKey(end);
  if (preset === 'all') return { endLocalDate, preset };
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
  if (preset === '6m') start.setMonth(start.getMonth() - 6);
  else if (preset === '1y') start.setFullYear(start.getFullYear() - 1);
  else start.setDate(start.getDate() - ({ '7d': 6, '30d': 29, '90d': 89 }[preset]));
  return { startLocalDate: toLocalDateKey(start), endLocalDate, preset };
}

export function validateWeight(weightKg: number): void {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000) throw new Error('Peso precisa ser um número positivo e razoável.');
}

export function validateMeasurements(measurements: BodyMeasurements): void {
  const values = [...Object.entries(measurements).filter(([key]) => key !== 'custom').map(([, value]) => value), ...Object.values(measurements.custom ?? {})];
  if (values.some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0 || value > 1000))) throw new Error('Medidas precisam ser números positivos e razoáveis.');
}

export function normalizeDecimal(value: string): number { return Number(value.trim().replace(',', '.')); }
