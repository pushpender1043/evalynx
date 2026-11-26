import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  accent?: 'purple' | 'mint' | 'amber' | 'coral';
  label?: string;
  className?: string;
}

const barColors = {
  purple: 'bg-[var(--accent-primary)]',
  mint: 'bg-[var(--semantic-mint)]',
  amber: 'bg-[var(--semantic-amber)]',
  coral: 'bg-[var(--semantic-coral)]',
};

export function ProgressBar({
  value,
  accent = 'purple',
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('clay-inset h-2.5 w-full overflow-hidden rounded-full', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `${clamped}%`}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', barColors[accent])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
