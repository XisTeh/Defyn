export function ModuleFallback({ label = 'Abrindo módulo' }: { label?: string }) {
  return <div className="module-fallback" role="status" aria-live="polite" aria-label={label}><span /><span /><span /><p>{label}…</p></div>;
}
