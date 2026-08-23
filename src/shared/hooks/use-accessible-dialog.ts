import { useEffect, type RefObject } from 'react';
import { useDocumentScrollLock } from './use-document-scroll-lock';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
}

/** Gives modal dialogs the same keyboard and focus behavior as the app drawer. */
export function useAccessibleDialog(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  useDocumentScrollLock();

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const focusInitial = () => (initialFocusRef?.current ?? getFocusableElements(dialogRef.current ?? document.body)[0])?.focus();
    const frame = window.requestAnimationFrame(focusInitial);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const elements = getFocusableElements(dialogRef.current);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0];
      if (!first) return;
      const last = elements.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [dialogRef, initialFocusRef, onClose]);
}
