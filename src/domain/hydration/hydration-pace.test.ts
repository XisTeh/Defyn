import { describe, expect, it } from 'vitest';
import { calculateHydrationPace, hydrationCheckpoints } from './hydration';
const at = (hour: number) => new Date(2026, 7, 21, hour, 0);
describe('ritmo de hidratação', () => {
  it('calcula metade da meta no meio da janela', () => expect(calculateHydrationPace(3000, 1500, '07:00', '23:00', at(15)).expectedMl).toBe(1500));
  it('fica dentro do ritmo com tolerância', () => expect(calculateHydrationPace(3000, 1400, '07:00', '23:00', at(15)).state).toBe('on-pace'));
  it('classifica pouco abaixo', () => expect(calculateHydrationPace(3000, 1100, '07:00', '23:00', at(15)).state).toBe('slightly-below'));
  it('classifica bem abaixo', () => expect(calculateHydrationPace(3000, 500, '07:00', '23:00', at(15)).state).toBe('well-below'));
  it('classifica acima', () => expect(calculateHydrationPace(3000, 2000, '07:00', '23:00', at(15)).state).toBe('above-pace'));
  it('prioriza meta atingida', () => expect(calculateHydrationPace(3000, 3000, '07:00', '23:00', at(12)).state).toBe('target-reached'));
  it('cria checkpoints cumulativos', () => expect(hydrationCheckpoints(3000).map((point) => Math.round(point.targetMl))).toEqual([990,2010,3000]));
});
