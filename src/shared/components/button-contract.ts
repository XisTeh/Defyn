export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';

export function buttonClassName(variant: ButtonVariant, compact: boolean, className = ''): string {
  return `defyn-button ${variant}${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`;
}
