import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface IllustratedActionCardProps {
  illustration: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
  className?: string;
}

export function IllustratedActionCard({
  illustration,
  title,
  subtitle,
  badge,
  onClick,
  className,
}: IllustratedActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'clay-card clay-card-interactive group relative flex h-full w-full cursor-pointer flex-col items-center justify-between px-5 py-6 text-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]',
        className
      )}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-[var(--semantic-mint-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--semantic-mint-text)]">
          {badge}
        </span>
      )}
      <div className="flex h-28 w-full items-center justify-center transition-transform duration-200 group-hover:scale-[1.03]">
        {illustration}
      </div>
      <div className="mt-3">
        <p className="text-[15px] font-bold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </button>
  );
}
