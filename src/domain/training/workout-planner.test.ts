import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from './exercise-library';
import type { TrainingProfile } from './training';
import { generateStarterPlan } from './workout-planner';

function profile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return { id: 'training-a', profileId: 'profile-a', primaryGoal: 'hypertrophy', experienceLevel: 'intermediate', availableDaysPerWeek: 3, preferredTrainingDays: ['monday', 'wednesday', 'friday'], averageSessionMinutes: 60, trainingLocation: 'gym', availableEquipment: [], preferredExercises: [], avoidedExercises: [], weightUnit: 'kg', defaultLoadIncrement: 2.5, advancedMode: false, createdAt: '2026-08-21T12:00:00.000Z', updatedAt: '2026-08-21T12:00:00.000Z', ...overrides };
}

function ids() { let value = 0; return () => `id-${++value}`; }

describe('biblioteca e planejador de treino', () => {
  it('mantém uma biblioteca inicial útil de 40–60 exercícios', () => {
    expect(BASE_EXERCISES.length).toBeGreaterThanOrEqual(40);
    expect(BASE_EXERCISES.length).toBeLessThanOrEqual(60);
    expect(new Set(BASE_EXERCISES.map((item) => item.id)).size).toBe(BASE_EXERCISES.length);
  });

  it.each([[3, 3], [4, 4], [6, 6]])('gera plano determinístico para %i dias', (days, expected) => {
    const result = generateStarterPlan(profile({ availableDaysPerWeek: days, preferredTrainingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].slice(0, days) as TrainingProfile['preferredTrainingDays'] }), new Date('2026-08-21T12:00:00.000Z'), ids());
    expect(result.plan.versions[0]?.templates).toHaveLength(expected);
    expect(result.plan.versions[0]?.templates.every((item) => item.exercises.length >= 4)).toBe(true);
  });

  it('oferece PPL repetido para seis dias sem obrigar domingo', () => {
    const result = generateStarterPlan(profile({ availableDaysPerWeek: 6, preferredTrainingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] }), new Date('2026-08-21T12:00:00.000Z'), ids());
    expect(result.plan.versions[0]?.templates.map((item) => item.name)).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
    expect(result.plan.versions[0]?.templates.some((item) => item.scheduledDay === 'sunday')).toBe(false);
  });

  it('respeita equipamentos de casa', () => {
    const result = generateStarterPlan(profile({ trainingLocation: 'home', availableEquipment: ['bodyweight', 'dumbbell'], availableDaysPerWeek: 3 }), new Date('2026-08-21T12:00:00.000Z'), ids());
    const selected = result.plan.versions[0]?.templates.flatMap((item) => item.exercises) ?? [];
    const selectedExercises = selected.map((item) => BASE_EXERCISES.find((exercise) => exercise.id === item.exerciseId));
    expect(selectedExercises.every((exercise) => exercise?.equipment.every((item) => item === 'bodyweight' || item === 'dumbbell'))).toBe(true);
  });

  it('não inclui exercício explicitamente evitado', () => {
    const avoided = BASE_EXERCISES.find((item) => item.primaryMuscle === 'chest')!;
    const result = generateStarterPlan(profile({ avoidedExercises: [avoided.id] }), new Date('2026-08-21T12:00:00.000Z'), ids());
    expect(result.plan.versions[0]?.templates.flatMap((item) => item.exercises).some((item) => item.exerciseId === avoided.id)).toBe(false);
  });

  it('é reproduzível com as mesmas entradas e gerador de ids', () => {
    const first = generateStarterPlan(profile(), new Date('2026-08-21T12:00:00.000Z'), ids());
    const second = generateStarterPlan(profile(), new Date('2026-08-21T12:00:00.000Z'), ids());
    expect(first).toEqual(second);
  });

  it('alerta sem interpretar limitação informada', () => {
    const result = generateStarterPlan(profile({ informedLimitations: 'Dor no ombro' }), new Date('2026-08-21T12:00:00.000Z'), ids());
    expect(result.warnings.join(' ')).toMatch(/revisão manual/);
  });
});
