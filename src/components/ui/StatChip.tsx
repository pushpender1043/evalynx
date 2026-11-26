import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface StatChipProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
}

/**
 * Compact stat chip using unified soft lavender icon tile (#EEEDFB) + purple icon (#6C5CE7).
 */
export function StatChip({ label, value, icon, className }: StatChipProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-[var(--shadow-clay-sm)]',
        className
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--text-muted)]">{label}</p>
        <p className="text-base font-bold leading-tight text-[var(--text-primary)] tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}
