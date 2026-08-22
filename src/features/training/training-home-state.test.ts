import { describe, expect, it } from 'vitest';
import { resolveTrainingHomeState } from './training-home-state';

describe('estado operacional da home de Treinos', () => {
  it('prioriza sessão em andamento', () => expect(resolveTrainingHomeState({ hasPlan: true, active: { name: 'Upper', currentExercise: 2, exerciseCount: 5 }, today: { name: 'Upper', exerciseCount: 5, minutes: 75 } })).toMatchObject({ kind: 'active', action: 'Continuar treino', detail: 'Exercício 2 de 5' }));
  it('mostra treino planejado e CTA direto', () => expect(resolveTrainingHomeState({ hasPlan: true, today: { name: 'Upper', exerciseCount: 5, minutes: 75 } })).toMatchObject({ kind: 'planned', action: 'Iniciar treino' }));
  it('mostra resumo quando o treino foi concluído', () => expect(resolveTrainingHomeState({ hasPlan: true, completed: { name: 'Upper', exerciseCount: 5, minutes: 68 } })).toMatchObject({ kind: 'completed', action: 'Ver resumo' }));
  it('explica descanso e próximo treino', () => expect(resolveTrainingHomeState({ hasPlan: true, next: { name: 'Lower', dayLabel: 'amanhã' } })).toMatchObject({ kind: 'rest', action: 'Ver ficha', detail: 'Próximo treino: Lower · amanhã' }));
  it('leva à criação quando não existe ficha', () => expect(resolveTrainingHomeState({ hasPlan: false })).toMatchObject({ kind: 'no-plan', action: 'Criar ficha' }));
});
