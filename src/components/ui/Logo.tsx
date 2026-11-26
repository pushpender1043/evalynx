import { useId } from 'react';
import { cn } from '../../lib/utils';

export type LogoVariant = 'icon' | 'full' | 'mono-white';
export type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  inverted?: boolean;
  showTagline?: boolean;
  className?: string;
}

const iconSizes: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

const wordmarkSizes: Record<LogoSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function Logo({
  variant = 'full',
  size = 'md',
  inverted = false,
  showTagline = false,
  className,
}: LogoProps) {
  const gradId = useId();
  const px = iconSizes[size];
  const isMonoWhite = variant === 'mono-white';

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none shrink-0', className)}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {!isMonoWhite && (
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6C5CE7" />
              <stop offset="100%" stopColor="#8E7DF5" />
            </linearGradient>
          </defs>
        )}

        {/* Rounded squircle emblem */}
        <rect
          width="48"
          height="48"
          rx="14"
          fill={isMonoWhite ? 'rgba(255, 255, 255, 0.2)' : `url(#${gradId})`}
        />

        {/* Stylized "E" built from 3 crisp rounded bars */}
        <rect x="12" y="12" width="6" height="24" rx="3" fill="#FFFFFF" />
        <rect x="12" y="12" width="24" height="6" rx="3" fill="#FFFFFF" />
        <rect x="12" y="21" width="16" height="6" rx="3" fill="#FFFFFF" />
        <rect x="12" y="30" width="24" height="6" rx="3" fill="#FFFFFF" />

        {/* Lynx sharp vision mint eye */}
        <circle
          cx="35"
          cy="24"
          r="3.6"
          fill={isMonoWhite ? '#FFFFFF' : '#5CC9A7'}
        />
      </svg>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              'font-extrabold tracking-[-0.03em] whitespace-nowrap',
              wordmarkSizes[size]
            )}
          >
            <span className={inverted ? 'text-white' : 'text-[#14123A] dark:text-[#F4F5FC]'}>
              Eva
            </span>
            <span className={inverted ? 'text-[#A89CF5]' : 'text-[#6C5CE7] dark:text-[#9D8FF8]'}>
              lynx
            </span>
          </span>
          {showTagline && (
            <span
              className={cn(
                'mt-0.5 text-[11px] font-medium tracking-tight',
                inverted ? 'text-indigo-200/85' : 'text-[var(--text-muted)]'
              )}
            >
              Evaluate smarter.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
