import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonVariant } from './button-contract';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  compact?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', compact = false, loading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return <button {...props} className={buttonClassName(variant, compact, className)} disabled={disabled || loading} aria-busy={loading || undefined}>{loading ? 'Aguarde…' : children}</button>;
}
