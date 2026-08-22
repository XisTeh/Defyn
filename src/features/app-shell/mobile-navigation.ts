import type { AppView } from '../../app/navigation';

export const MOBILE_NAVIGATION_MODE = 'drawer' as const;
export const MOBILE_MENU_TRIGGER = 'profile' as const;
export const MOBILE_HEADER_HAS_HAMBURGER = false as const;

export const navigationSections: readonly {
  label: string;
  items: readonly { view: AppView; label: string; symbol: string }[];
}[] = [
  {
    label: 'Acompanhamento',
    items: [
      { view: 'today', label: 'Hoje', symbol: '◒' },
      { view: 'diary', label: 'Diário', symbol: '≡' },
      { view: 'foods', label: 'Alimentos', symbol: '◇' },
      { view: 'recipes', label: 'Receitas', symbol: '⌁' },
      { view: 'planner', label: 'Planejamento', symbol: '◎' },
      { view: 'training', label: 'Treinos', symbol: '◫' },
      { view: 'progress', label: 'Progresso', symbol: '↗' },
    ],
  },
  {
    label: 'Conta local',
    items: [
      { view: 'profile', label: 'Ficha e metas', symbol: '◎' },
      { view: 'profiles', label: 'Perfis', symbol: '◉' },
      { view: 'backup', label: 'Backup', symbol: '⇅' },
    ],
  },
];

export type MobileDrawerAction = 'open' | 'close' | 'navigate' | 'overlay' | 'escape';

export function mobileDrawerReducer(_open: boolean, action: MobileDrawerAction): boolean {
  return action === 'open';
}

export function isActiveNavigation(current: AppView, candidate: AppView): boolean {
  return current === candidate;
}

export function uniqueProfileSwitchItems<T extends { id: string }>(profiles: readonly T[]): T[] {
  return [...new Map(profiles.map((profile) => [profile.id, profile])).values()];
}
