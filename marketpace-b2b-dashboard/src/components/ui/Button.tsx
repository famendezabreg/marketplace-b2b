import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-paper-50 hover:bg-ink-800 disabled:bg-ink-500 shadow-sm',
  secondary:
    'bg-paper-50 text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-paper-200',
  ghost: 'text-ink-700 hover:bg-paper-200',
  danger: 'bg-alert-500 text-paper-50 hover:bg-alert-600 disabled:bg-ink-500',
};

export function Button({
  variant = 'primary',
  isLoading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
