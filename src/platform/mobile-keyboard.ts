import { useEffect, useState } from 'react';

export interface KeyboardViewportSnapshot {
  layoutHeight: number;
  visualHeight: number;
  editableFocused: boolean;
}

export function isEditableElement(target: Element | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [role="textbox"]');
}

export function keyboardIsOpen({ layoutHeight, visualHeight, editableFocused }: KeyboardViewportSnapshot): boolean {
  if (!editableFocused || layoutHeight <= 0 || visualHeight <= 0) return false;
  const reduction = layoutHeight - visualHeight;
  return reduction >= Math.max(120, layoutHeight * 0.18);
}

export function useMobileKeyboard(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let fallbackBaseline = window.innerHeight;

    const measure = () => {
      const editableFocused = isEditableElement(document.activeElement);
      const layoutHeight = Math.max(document.documentElement.clientHeight, fallbackBaseline);
      const visualHeight = viewport?.height ?? window.innerHeight;
      setOpen(keyboardIsOpen({ layoutHeight, visualHeight, editableFocused }));
      if (!editableFocused && !viewport) fallbackBaseline = Math.max(fallbackBaseline, window.innerHeight);
    };

    const reset = () => {
      fallbackBaseline = window.innerHeight;
      window.setTimeout(measure, 120);
    };
    const measureAfterFocus = () => window.setTimeout(measure, 0);

    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', reset);
    document.addEventListener('focusin', measure);
    document.addEventListener('focusout', measureAfterFocus);
    measure();
    return () => {
      viewport?.removeEventListener('resize', measure);
      viewport?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', reset);
      document.removeEventListener('focusin', measure);
      document.removeEventListener('focusout', measureAfterFocus);
    };
  }, []);

  return open;
}
