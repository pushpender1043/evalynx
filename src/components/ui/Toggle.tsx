import { useId } from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  const switchId = useId();

  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={switchId} className="cursor-pointer select-none">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
        )}
      </label>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2',
          checked
            ? 'bg-[var(--accent-primary)] shadow-[var(--shadow-clay-primary-pressed)]'
            : 'clay-inset'
        )}
      >
        <span
          className={cn(
            'inline-block h-6 w-6 transform rounded-full bg-[var(--bg-surface-elevated)] shadow-[var(--shadow-clay-sm)] transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
