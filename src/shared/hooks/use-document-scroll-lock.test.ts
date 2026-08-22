import { describe, expect, it } from 'vitest';
import { acquireDocumentScrollLock } from './use-document-scroll-lock';

function root() {
  const classes = new Set<string>();
  return {
    classes,
    value: {
      dataset: {} as DOMStringMap,
      classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
    },
  };
}

describe('scroll lock compartilhado', () => {
  it('mantém o fundo bloqueado enquanto existir modal ou drawer aninhado', () => {
    const target = root();
    const releaseDrawer = acquireDocumentScrollLock(target.value);
    const releaseModal = acquireDocumentScrollLock(target.value);
    expect(target.value.dataset.defynScrollLocks).toBe('2');
    releaseModal();
    expect(target.classes.has('defyn-scroll-locked')).toBe(true);
    releaseDrawer();
    expect(target.classes.has('defyn-scroll-locked')).toBe(false);
  });
});
