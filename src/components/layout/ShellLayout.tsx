import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface ShellLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 3-Layer Shell Architecture:
 * - Layer 1: Soft lavender-grey canvas (#D9DAEE light / #0E0C2B dark) with very faint decorative inline SVG curves (6-8% opacity).
 * - Layer 2: Single large off-white rounded panel (#FAFAFE light / #1A1744 dark), 40px radius on desktop, 24-32px margin on desktop, 12px on tablet, 0px full-bleed on mobile.
 * - Layer 3: Attached purple sidebar tab on the left + internally scrolling Bento workspace on the right.
 */
export function ShellLayout({ sidebar, children, className }: ShellLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[var(--bg-canvas)] transition-colors duration-200 md:h-screen md:overflow-hidden md:p-3 lg:p-6 xl:p-8">
      {/* Layer 1 decorative faint curved SVG lines & tiny accent dots */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full select-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M-80 180C180 90 420 290 740 160C1060 30 1280 210 1520 110"
          stroke="var(--accent-primary)"
          strokeOpacity="0.075"
          strokeWidth="1.2"
        />
        <path
          d="M-60 760C240 620 510 840 860 700C1140 588 1320 740 1520 660"
          stroke="var(--accent-primary)"
          strokeOpacity="0.07"
          strokeWidth="1.2"
        />
        <path
          d="M1120 -40C1060 220 1240 460 1180 940"
          stroke="var(--accent-primary)"
          strokeOpacity="0.06"
          strokeWidth="1"
        />
        <circle cx="96" cy="112" r="4" fill="var(--accent-primary)" fillOpacity="0.22" />
        <circle cx="1376" cy="790" r="5" fill="var(--semantic-mint)" fillOpacity="0.3" />
        <circle cx="1320" cy="78" r="3.5" fill="var(--accent-secondary)" fillOpacity="0.26" />
      </svg>

      {/* Layer 2 Main Shell Panel */}
      <div
        className={cn(
          'relative z-10 mx-auto flex min-h-screen w-full max-w-[1480px] bg-[var(--bg-panel)] transition-colors duration-200',
          'md:h-full md:min-h-0 md:overflow-hidden md:rounded-[40px] md:shadow-[var(--shadow-panel)]',
          'md:ring-1 md:ring-white/70 dark:md:ring-white/[0.06]',
          className
        )}
      >
        {/* Attached left sidebar rail (vertically centered inside panel on >=768px) */}
        {sidebar && (
          <div className="relative z-20 hidden w-[84px] shrink-0 items-center justify-start md:flex">
            {sidebar}
          </div>
        )}

        {/* Internally scrollable right content column */}
        <div className="evx-panel-scroll flex min-w-0 flex-1 flex-col md:h-full md:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
