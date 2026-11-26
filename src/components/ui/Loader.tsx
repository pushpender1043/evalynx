import type { CSSProperties } from 'react';
import { cn } from '../../lib/utils';

export type LoaderSize = 'sm' | 'md' | 'lg';

interface LoaderProps {
  size?: LoaderSize;
  fullscreen?: boolean;
  className?: string;
}

const SIZE_CONFIG: Record<
  LoaderSize,
  {
    ball: string;
    shadow: string;
    gap: string;
    trackHeight: string;
    jump: string;
  }
> = {
  sm: {
    ball: 'h-2 w-2',
    shadow: 'h-[2px] w-2',
    gap: 'gap-1.5',
    trackHeight: 'h-4',
    jump: '6px',
  },
  md: {
    ball: 'h-3 w-3',
    shadow: 'h-[3px] w-3',
    gap: 'gap-2.5',
    trackHeight: 'h-7',
    jump: '14px',
  },
  lg: {
    ball: 'h-3.5 w-3.5',
    shadow: 'h-1 w-3.5',
    gap: 'gap-3',
    trackHeight: 'h-9',
    jump: '18px',
  },
};

const DOTS = [
  { colorVar: 'var(--loader-ball-1)', delay: '0s' },
  { colorVar: 'var(--loader-ball-2)', delay: '0.15s' },
  { colorVar: 'var(--loader-ball-3)', delay: '0.3s' },
] as const;

export function Loader({ size = 'md', fullscreen = false, className }: LoaderProps) {
  const cfg = SIZE_CONFIG[size];

  const dots = (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{ '--evx-jump': cfg.jump } as CSSProperties}
      className={cn(
        'inline-flex items-end justify-center select-none',
        cfg.gap,
        cfg.trackHeight,
        className
      )}
    >
      {DOTS.map((dot, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <span
            className={cn('evx-ball block rounded-full', cfg.ball)}
            style={{
              backgroundColor: dot.colorVar,
              animationDelay: dot.delay,
            }}
            aria-hidden="true"
          />
          <span
            className={cn('evx-ball-shadow mt-1 block rounded-full', cfg.shadow)}
            style={{
              backgroundColor: 'var(--loader-shadow)',
              animationDelay: dot.delay,
            }}
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        data-testid="evalynx-fullscreen-loader"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-canvas)] transition-colors duration-200"
      >
        {dots}
      </div>
    );
  }

  return dots;
}
