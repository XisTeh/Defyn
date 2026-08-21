import { describe, expect, it } from 'vitest';
import { ACTIVITY_PRESET_EXPLANATIONS, activityPresetExplanation, VIDEO_ACTIVITY_PRESETS } from './presets';

describe('presets explicáveis', () => {
  it('mantém os três fatores adotados pelo DEFYN', () => {
    expect(VIDEO_ACTIVITY_PRESETS.map((preset) => preset.factor)).toEqual([1.3, 1.5, 1.7]);
  });

  it('explica cada fator sem depender apenas do número de treinos', () => {
    expect(ACTIVITY_PRESET_EXPLANATIONS).toHaveLength(3);
    for (const preset of ACTIVITY_PRESET_EXPLANATIONS) {
      expect(preset.summary.length).toBeGreaterThan(10);
      expect(preset.examples.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('usa Moderada como explicação segura para fator não mapeado', () => {
    expect(activityPresetExplanation(1.42)).toMatchObject({ label: 'Moderada', factor: 1.5 });
  });
});
