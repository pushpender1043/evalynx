import type { ReactNode } from 'react';
import { ClayCard } from '../ui';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: ReactNode;
  /** Retained for backwards compatibility; all stat icons use the unified lavender + purple tile */
  accent?: 'purple' | 'mint' | 'amber' | 'coral';
}

export function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <ClayCard interactive className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums sm:text-3xl">
          {value}
        </p>
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{subtext}</p>
      </div>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
        {icon}
      </div>
    </ClayCard>
  );
}
