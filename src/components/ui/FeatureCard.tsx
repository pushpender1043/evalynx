import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface FeatureCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  illustration: ReactNode;
  className?: string;
}

/**
 * The ONE purple highlight feature card per dashboard.
 * Uses the #7A6CF0 -> #6C5CE7 gradient with crisp white copy and a dark navy CTA button.
 */
export function FeatureCard({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  illustration,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-[28px] p-6 text-white shadow-[var(--shadow-clay-primary)]',
        'bg-gradient-to-b from-[#7A6CF0] to-[#6C5CE7]',
        className
      )}
    >
      {/* Subtle decorative faint arcs */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 opacity-[0.12]"
        viewBox="0 0 160 160"
        fill="none"
      >
        <circle cx="80" cy="80" r="64" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="80" cy="80" r="42" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {eyebrow}
            </span>
          )}
          <h3 className="mt-2.5 text-lg font-bold leading-snug text-white">{title}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-white/80">{description}</p>
        </div>
        <div className="shrink-0 -mr-1 -mt-1">{illustration}</div>
      </div>

      <div className="relative z-10 mt-5">
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-[14px] bg-[#14123A] px-5 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(20,18,58,0.28)] transition-all duration-150 hover:bg-[#1F1C52] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6C5CE7]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
