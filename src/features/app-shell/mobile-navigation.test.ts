import { describe, expect, it } from 'vitest';
import { isActiveNavigation, MOBILE_HEADER_HAS_HAMBURGER, MOBILE_MENU_TRIGGER, MOBILE_NAVIGATION_MODE, mobileDrawerReducer, navigationSections, uniqueProfileSwitchItems } from './mobile-navigation';

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

  it('abre o drawer pelo perfil e não renderiza hamburger', () => {
    expect(MOBILE_MENU_TRIGGER).toBe('profile');
    expect(MOBILE_HEADER_HAS_HAMBURGER).toBe(false);
  });

  it('lista cada perfil uma única vez na área de troca', () => {
    expect(uniqueProfileSwitchItems([{ id: 'ronnan' }, { id: 'janife' }, { id: 'ronnan' }])).toEqual([{ id: 'ronnan' }, { id: 'janife' }]);
  });
});
