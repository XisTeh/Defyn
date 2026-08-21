import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import './defyn-select.css';

export interface DefynSelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface DefynSelectProps<T extends string> {
  value: T;
  options: readonly DefynSelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  tone?: 'light' | 'dark';
}

export function DefynSelect<T extends string>({ value, options, onChange, label, disabled = false, className = '', tone = 'light' }: DefynSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const [position, setPosition] = useState({ left: 0, top: 0, width: 260 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target) || optionRefs.current.some((item) => item?.contains(target))) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function move(index: number) {
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
  }

  function handleTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      setActiveIndex(event.key === 'ArrowUp' ? Math.max(0, selectedIndex - 1) : selectedIndex);
      setOpen(true);
    } else if (event.key === 'Home') { event.preventDefault(); choose(0); }
    else if (event.key === 'End') { event.preventDefault(); choose(options.length - 1); }
  }

  function handleOptionKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); move(0); }
    else if (event.key === 'End') { event.preventDefault(); move(options.length - 1); }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(index); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }
    else if (event.key === 'Tab') setOpen(false);
  }

  return <div className={`defyn-select defyn-select--${tone} ${className}`}>
    <button ref={triggerRef} className="defyn-select-trigger" type="button" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listboxId : undefined} onClick={() => { setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value))); setOpen((current) => !current); }} onKeyDown={handleTriggerKey}>
      <span><strong>{selected?.label ?? value}</strong>{selected?.description && <small>{selected.description}</small>}</span><i aria-hidden="true">⌄</i>
    </button>
    {open && createPortal(<div className={`defyn-select-layer defyn-select-layer--${tone}`}><div id={listboxId} className="defyn-select-options" role="listbox" aria-label={label} style={{ '--select-left': `${position.left}px`, '--select-top': `${position.top}px`, '--select-width': `${position.width}px` } as React.CSSProperties}>{options.map((option, index) => <button key={option.value} ref={(element) => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={option.value === value} tabIndex={index === activeIndex ? 0 : -1} className={option.value === value ? 'selected' : ''} onClick={() => choose(index)} onKeyDown={(event) => handleOptionKey(event, index)}><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{option.value === value && <b aria-hidden="true">✓</b>}</button>)}</div></div>, document.body)}
  </div>;
}
