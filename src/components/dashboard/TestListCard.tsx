import { Clock, Users, ArrowUpRight } from 'lucide-react';
import type { TestItem, TestStatus } from '../../types';
import { EmptyTestsIllustration } from '../illustrations';
import { ClayBadge, ClayCard, DashedAddCard, EmptyState, type ClayBadgeTone } from '../ui';
import { formatDateTime } from '../../lib/utils';

interface TestListCardProps {
  tests: TestItem[];
  totalCount: number;
  activeStatus: TestStatus | 'all';
  onStatusChange: (status: TestStatus | 'all') => void;
  onSelectTest: (test: TestItem) => void;
  onCreateNew: () => void;
}

const statusMeta: Record<TestStatus, { label: string; tone: ClayBadgeTone }> = {
  live: { label: 'Live', tone: 'mint' },
  scheduled: { label: 'Scheduled', tone: 'purple' },
  draft: { label: 'Draft', tone: 'neutral' },
  completed: { label: 'Completed', tone: 'neutral' },
};

const filterTabs: Array<{ value: TestStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
];

export function TestListCard({
  tests,
  totalCount,
  activeStatus,
  onStatusChange,
  onSelectTest,
  onCreateNew,
}: TestListCardProps) {
  return (
    <ClayCard className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
              Live & Upcoming Tests
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Drafts, scheduled sessions, and active exams
            </p>
          </div>

          {totalCount > 0 && (
            <div
              role="tablist"
              aria-label="Filter tests by status"
              className="inline-flex items-center gap-1 rounded-[14px] bg-[var(--bg-surface-tinted)] p-1"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={activeStatus === tab.value}
                  onClick={() => onStatusChange(tab.value)}
                  className={`cursor-pointer rounded-[10px] px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                    activeStatus === tab.value
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-clay-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          {totalCount === 0 ? (
            <EmptyState
              embedded
              compact
              illustration={<EmptyTestsIllustration size={126} />}
              title="No tests yet"
              description="Create your first test draft to generate a join code and schedule an assessment."
              actionLabel="Create your first test"
              onAction={onCreateNew}
            />
          ) : tests.length === 0 ? (
            <EmptyState
              embedded
              compact
              illustration={<EmptyTestsIllustration size={116} />}
              title="No matching tests"
              description="Try switching the status filter or clearing your search query."
              actionLabel="Show all tests"
              onAction={() => onStatusChange('all')}
            />
          ) : (
            tests.slice(0, 4).map((item) => {
              const meta = statusMeta[item.status];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTest(item)}
                  aria-label={`Inspect ${item.title}`}
                  className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-[18px] bg-[var(--bg-surface-tinted)] px-4 py-3 text-left transition-all hover:bg-[var(--bg-surface-hover)] hover:shadow-[var(--shadow-clay-sm)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {item.title}
                      </h3>
                      <ClayBadge tone={meta.tone}>
                        {item.status === 'live' && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-[var(--semantic-mint)]"
                            aria-hidden="true"
                          />
                        )}
                        {meta.label}
                      </ClayBadge>
                    </div>
                    <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                      {item.subject} ·{' '}
                      <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                        {item.code}
                      </span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatDateTime(item.scheduledAt)} · {item.durationMinutes}m
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {item.enrolledCount} enrolled
                      </span>
                    </div>
                  </div>

                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[var(--bg-surface)] text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent-primary)]">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Dashed "+ Create new test" placeholder card inside */}
      {totalCount > 0 && (
        <div className="mt-4">
          <DashedAddCard
            compact
            label="Create new test"
            sublabel="Build a new timed or monitored assessment"
            onClick={onCreateNew}
          />
        </div>
      )}
    </ClayCard>
  );
}
