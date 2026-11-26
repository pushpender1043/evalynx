import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Loader } from './Loader';

export type ClayButtonVariant = 'primary' | 'navy' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ClayButtonSize = 'sm' | 'md' | 'lg';

export interface ClayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ClayButtonVariant, string> = {
  primary: 'clay-btn-primary text-white',
  navy: 'clay-btn-navy',
  secondary: 'clay-btn-secondary text-[var(--text-primary)]',
  ghost:
    'rounded-[16px] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-tinted)] hover:text-[var(--text-primary)] active:translate-y-[1px]',
  danger:
    'rounded-[16px] bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)] hover:opacity-95 active:translate-y-[1px]',
  icon: 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
};

const sizeClasses: Record<ClayButtonSize, string> = {
  sm: 'min-h-[38px] px-4 py-2 text-xs',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[50px] px-6 py-3 text-sm',
};

const iconSizeClasses: Record<ClayButtonSize, string> = {
  sm: 'h-9 w-9 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-11 w-11 p-0',
};

export function ClayButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ClayButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 font-semibold select-none whitespace-nowrap transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        variant === 'icon' ? iconSizeClasses[size] : sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader size="sm" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
      )}
      {children != null && <span>{children}</span>}
      {!loading && rightIcon && (
        <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
      )}
    </button>
  );
}
