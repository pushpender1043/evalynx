import type { TopicMastery } from '../../types';
import { EmptyPerformanceIllustration } from '../illustrations';
import { ClayCard, EmptyState, ProgressRing } from '../ui';

interface TopicProgressCardProps {
  topics: TopicMastery[];
}

export function TopicProgressCard({ topics }: TopicProgressCardProps) {
  return (
    <ClayCard className="flex h-full flex-col justify-between">
      <div>
        <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
          Topic Mastery
        </h2>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Accuracy across evaluated assessments
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            embedded
            compact
            illustration={<EmptyPerformanceIllustration size={126} />}
            title="No topic data yet"
            description="Complete your first test to see your subject-wise mastery rings."
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {topics.slice(0, 6).map((item, idx) => (
            <div
              key={item.id}
              className="flex flex-col items-center rounded-[20px] bg-[var(--bg-surface-tinted)] p-3.5 text-center"
            >
              <ProgressRing
                value={item.masteryPercent}
                size={68}
                strokeWidth={6}
                accent={idx % 2 === 0 ? 'purple' : 'mint'}
                label={item.topic}
              />
              <p className="mt-2.5 line-clamp-1 text-xs font-bold text-[var(--text-primary)]">
                {item.topic}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                {item.testsTaken} {item.testsTaken === 1 ? 'test' : 'tests'}
              </p>
            </div>
          ))}
        </div>
      )}
    </ClayCard>
  );
}
