import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ClayBadgeTone = 'purple' | 'mint' | 'coral' | 'amber' | 'neutral';

export interface ClayBadgeProps {
  children: ReactNode;
  tone?: ClayBadgeTone;
  className?: string;
}

const toneClasses: Record<ClayBadgeTone, string> = {
  purple: 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)]',
  mint: 'bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)]',
  coral: 'bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)]',
  amber: 'bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)]',
  neutral: 'bg-[var(--bg-surface-tinted)] text-[var(--text-secondary)]',
};

export function ClayBadge({ children, tone = 'neutral', className }: ClayBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight whitespace-nowrap',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
