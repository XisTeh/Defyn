import { useEffect } from 'react';

interface ScrollLockRoot {
  dataset: DOMStringMap;
  classList: { add: (name: string) => void; remove: (name: string) => void };
}

export function acquireDocumentScrollLock(root: ScrollLockRoot = document.documentElement): () => void {
  const count = Number(root.dataset.defynScrollLocks ?? 0) + 1;
  root.dataset.defynScrollLocks = String(count);
  root.classList.add('defyn-scroll-locked');
  return () => {
    const remaining = Math.max(0, Number(root.dataset.defynScrollLocks ?? 1) - 1);
    if (remaining) root.dataset.defynScrollLocks = String(remaining);
    else {
      delete root.dataset.defynScrollLocks;
      root.classList.remove('defyn-scroll-locked');
    }
  };
}

export function useDocumentScrollLock(): void {
  useEffect(() => acquireDocumentScrollLock(), []);
}
