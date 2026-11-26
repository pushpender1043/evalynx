import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ClayInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export function ClayInput({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  id,
  className,
  ...rest
}: ClayInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-[var(--text-primary)]"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'clay-inset relative flex items-center',
          error && 'ring-2 ring-[var(--semantic-coral)]/70'
        )}
      >
        {leftIcon && (
          <span
            className="pointer-events-none absolute left-4 flex items-center text-[var(--text-muted)]"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            'min-h-[46px] w-full rounded-[18px] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'focus:outline-none',
            Boolean(leftIcon) && 'pl-11',
            Boolean(rightSlot) && 'pr-11',
            className
          )}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-2.5 flex items-center">{rightSlot}</span>
        )}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-[var(--semantic-coral-text)]"
        >
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}
