import { describe, expect, it } from 'vitest';
import { isActiveNavigation, MOBILE_NAVIGATION_MODE, mobileDrawerReducer, navigationSections } from './mobile-navigation';

describe('navegação mobile por drawer', () => {
  it('abre explicitamente e fecha por navegação, overlay, Escape ou botão', () => {
    expect(mobileDrawerReducer(false, 'open')).toBe(true);
    for (const action of ['close', 'navigate', 'overlay', 'escape'] as const) {
      expect(mobileDrawerReducer(true, action)).toBe(false);
    }
  });

  it('marca somente a área atual como ativa', () => {
    expect(isActiveNavigation('training', 'training')).toBe(true);
    expect(isActiveNavigation('training', 'today')).toBe(false);
  });

  it('substitui a navegação inferior e expõe todas as áreas', () => {
    expect(MOBILE_NAVIGATION_MODE).toBe('drawer');
    expect(navigationSections.flatMap((section) => section.items.map((item) => item.view))).toEqual([
      'today', 'diary', 'foods', 'recipes', 'planner', 'training', 'progress', 'profile', 'profiles', 'backup',
    ]);
  });
});
