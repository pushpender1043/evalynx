import { Clock, Shield, ArrowRight } from 'lucide-react';
import type { TestItem } from '../../types';
import { useCountdown } from '../../hooks/useCountdown';
import { ClayBadge, ClayButton } from '../../components/ui';

interface UpcomingTestRowProps {
  test: TestItem;
  onJoin: (test: TestItem) => void;
}

export function UpcomingTestRow({ test, onJoin }: UpcomingTestRowProps) {
  const countdown = useCountdown(test.scheduledAt);
  const isLive = test.status === 'live' || countdown.isExpired;

  return (
    <div className="flex flex-col gap-3 rounded-[18px] bg-[var(--bg-surface-tinted)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{test.title}</h3>
          <ClayBadge tone={isLive ? 'mint' : 'purple'}>
            {isLive && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--semantic-mint)]"
                aria-hidden="true"
              />
            )}
            {isLive ? 'Live Now' : `Starts in ${countdown.label}`}
          </ClayBadge>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {test.subject}
          {test.professorName ? ` · ${test.professorName}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-muted)] tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {test.durationMinutes} min · {test.totalMarks} marks
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Code <strong className="font-mono-tabular text-[var(--text-primary)]">{test.code}</strong>
          </span>
        </div>
      </div>

      <ClayButton
        variant={isLive ? 'navy' : 'secondary'}
        size="sm"
        onClick={() => onJoin(test)}
        rightIcon={<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
      >
        {isLive ? 'Join Exam' : 'View Details'}
      </ClayButton>
    </div>
  );
}
