export type TrainingHomeState =
  | { kind: 'no-plan'; eyebrow: 'Sem ficha'; title: 'Você ainda não possui ficha.'; action: 'Criar ficha' }
  | { kind: 'active'; eyebrow: 'Treino em andamento'; title: string; detail: string; action: 'Continuar treino' }
  | { kind: 'completed'; eyebrow: 'Treino concluído'; title: string; detail: string; action: 'Ver resumo' }
  | { kind: 'planned'; eyebrow: 'Treino de hoje'; title: string; detail: string; action: 'Iniciar treino' }
  | { kind: 'rest'; eyebrow: 'Hoje é descanso'; title: 'Recupere-se para o próximo treino.'; detail: string; action: 'Ver ficha' };

interface TrainingHomeInput {
  hasPlan: boolean;
  active?: { name: string; currentExercise: number; exerciseCount: number };
  today?: { name: string; exerciseCount: number; minutes: number };
  completed?: { name: string; exerciseCount: number; minutes: number };
  next?: { name: string; dayLabel: string };
}

export function resolveTrainingHomeState(input: TrainingHomeInput): TrainingHomeState {
  if (input.active) return { kind: 'active', eyebrow: 'Treino em andamento', title: input.active.name, detail: `Exercício ${input.active.currentExercise} de ${input.active.exerciseCount}`, action: 'Continuar treino' };
  if (!input.hasPlan) return { kind: 'no-plan', eyebrow: 'Sem ficha', title: 'Você ainda não possui ficha.', action: 'Criar ficha' };
  if (input.completed) return { kind: 'completed', eyebrow: 'Treino concluído', title: input.completed.name, detail: `${input.completed.exerciseCount} exercícios · ${input.completed.minutes} min`, action: 'Ver resumo' };
  if (input.today) return { kind: 'planned', eyebrow: 'Treino de hoje', title: input.today.name, detail: `${input.today.exerciseCount} exercícios · ~${input.today.minutes} min`, action: 'Iniciar treino' };
  return { kind: 'rest', eyebrow: 'Hoje é descanso', title: 'Recupere-se para o próximo treino.', detail: input.next ? `Próximo treino: ${input.next.name} · ${input.next.dayLabel}` : 'Confira sua semana na ficha.', action: 'Ver ficha' };
}
