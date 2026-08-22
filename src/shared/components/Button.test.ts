import { describe, expect, it } from 'vitest';
import { buttonClassName } from './button-contract';

describe('contrato visual do botão compartilhado', () => {
  it('mantém a classe-base em todas as variantes', () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'icon'] as const) {
      expect(buttonClassName(variant, false)).toBe(`defyn-button ${variant}`);
    }
  });

  it('combina densidade compacta e classe contextual sem perder o padrão', () => {
    expect(buttonClassName('secondary', true, 'today-workout-action')).toBe(
      'defyn-button secondary compact today-workout-action',
    );
  });
});
