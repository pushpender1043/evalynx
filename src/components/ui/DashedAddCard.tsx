import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DashedAddCardProps {
  label: string;
  sublabel?: string;
  onClick: () => void;
  compact?: boolean;
  className?: string;
}

export function DashedAddCard({
  label,
  sublabel,
  onClick,
  compact = false,
  className,
}: DashedAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'clay-card-dashed group flex w-full cursor-pointer items-center justify-center text-center',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
        compact ? 'gap-2.5 rounded-[20px] px-4 py-3.5' : 'flex-col gap-2.5 px-5 py-6',
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-[var(--tile-lavender)] text-[var(--accent-primary)] transition-transform duration-150 group-hover:scale-105',
          compact ? 'h-8 w-8' : 'h-11 w-11'
        )}
      >
        <Plus className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={2} />
      </span>
      <div className={compact ? 'text-left' : 'text-center'}>
        <p className="text-xs font-bold text-[var(--text-primary)] sm:text-sm">{label}</p>
        {sublabel && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sublabel}</p>}
      </div>
    </button>
  );
}
