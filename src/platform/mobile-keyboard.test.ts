import { describe, expect, it } from 'vitest';
import { keyboardIsOpen } from './mobile-keyboard';

describe('detecção de teclado mobile', () => {
  it('detecta redução relevante do visual viewport durante edição', () => {
    expect(keyboardIsOpen({ layoutHeight: 800, visualHeight: 470, editableFocused: true })).toBe(true);
  });

  it('não confunde barra do navegador com teclado', () => {
    expect(keyboardIsOpen({ layoutHeight: 800, visualHeight: 710, editableFocused: true })).toBe(false);
  });

  it('não oculta navegação apenas por foco', () => {
    expect(keyboardIsOpen({ layoutHeight: 800, visualHeight: 800, editableFocused: true })).toBe(false);
  });

  it('ignora viewport reduzido quando não há campo editável', () => {
    expect(keyboardIsOpen({ layoutHeight: 800, visualHeight: 450, editableFocused: false })).toBe(false);
  });
});
