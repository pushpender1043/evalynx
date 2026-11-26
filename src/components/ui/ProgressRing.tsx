import { cn } from '../../lib/utils';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  accent?: 'purple' | 'mint' | 'amber' | 'coral';
  label?: string;
  className?: string;
}

const strokeColors = {
  purple: 'var(--accent-primary)',
  mint: 'var(--semantic-mint)',
  amber: 'var(--semantic-amber)',
  coral: 'var(--semantic-coral)',
};

export function ProgressRing({
  value,
  size = 76,
  strokeWidth = 7,
  accent = 'purple',
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full shrink-0',
        className
      )}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${clamped}%` : `${clamped}% progress`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--tile-lavender)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColors[accent]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums text-[var(--text-primary)]">
        {clamped}%
      </span>
    </div>
  );
}
