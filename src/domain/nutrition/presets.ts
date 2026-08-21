import type { ActivityPresetId, MacroConfiguration } from './types';

export interface ActivityPreset {
  id: ActivityPresetId;
  label: string;
  factor: number;
}

export interface ActivityPresetExplanation extends ActivityPreset {
  summary: string;
  examples: readonly string[];
}

export const VIDEO_ACTIVITY_PRESETS: readonly ActivityPreset[] = [
  { id: 'video-light', label: 'Leve', factor: 1.3 },
  { id: 'video-moderate', label: 'Moderada', factor: 1.5 },
  { id: 'video-high', label: 'Alta', factor: 1.7 },
] as const;

export const ACTIVITY_PRESET_EXPLANATIONS: readonly ActivityPresetExplanation[] = [
  {
    id: 'video-light', label: 'Leve', factor: 1.3,
    summary: 'Rotina principalmente sedentária',
    examples: ['Passa grande parte do dia sentado', 'Pouco deslocamento a pé', 'Treino leve ou pouco frequente'],
  },
  {
    id: 'video-moderate', label: 'Moderada', factor: 1.5,
    summary: 'Treino regular + rotina normal',
    examples: ['Treina regularmente', 'Academia aproximadamente 3–6 vezes por semana', 'Restante do dia com atividade normal'],
  },
  {
    id: 'video-high', label: 'Alta', factor: 1.7,
    summary: 'Treino intenso + rotina bastante ativa',
    examples: ['Treinos frequentes ou intensos', 'Bastante movimento ao longo do dia', 'Trabalho físico ou volume elevado de atividade'],
  },
] as const;

export function activityPresetExplanation(factor: number): ActivityPresetExplanation {
  return ACTIVITY_PRESET_EXPLANATIONS.find((preset) => preset.factor === factor) ?? {
    id: 'video-moderate', label: 'Moderada', factor: 1.5,
    summary: 'Treino regular + rotina normal',
    examples: ['Treina regularmente', 'Academia aproximadamente 3–6 vezes por semana', 'Restante do dia com atividade normal'],
  };
}

export const VIDEO_MACRO_PRESET: MacroConfiguration = {
  mode: 'derived-carbs',
  protein: { mode: 'per-kg', gramsPerKg: 2 },
  fat: { mode: 'per-kg', gramsPerKg: 1 },
};

export const EXAMPLE_CALORIE_DEFICIT_KCAL = 400;
