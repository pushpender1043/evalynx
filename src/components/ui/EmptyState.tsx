import type { ReactNode } from 'react';
import { ClayButton } from './ClayButton';
import { ClayCard } from './ClayCard';
import { EmptyTestsIllustration } from '../illustrations';

interface EmptyStateProps {
  illustration?: ReactNode;
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  embedded?: boolean;
}

export function EmptyState({
  illustration,
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  compact = false,
  embedded = false,
}: EmptyStateProps) {
  const inner = (
    <div
      className={
        compact
          ? 'flex flex-col items-center justify-center py-6 px-4 text-center'
          : 'flex flex-col items-center justify-center py-10 px-6 text-center'
      }
    >
      {illustration ? (
        <div className="flex items-center justify-center">{illustration}</div>
      ) : icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
          {icon}
        </div>
      ) : (
        <EmptyTestsIllustration size={compact ? 112 : 136} />
      )}
      <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
        {description}
      </p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <ClayButton variant="navy" size="sm" onClick={onAction}>
              {actionLabel}
            </ClayButton>
          )}
          {secondaryLabel && onSecondaryAction && (
            <ClayButton variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryLabel}
            </ClayButton>
          )}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return inner;
  }

  return <ClayCard padding="none">{inner}</ClayCard>;
}
