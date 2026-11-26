import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, AlertCircle, ArrowRight } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ClayBadge, ClayButton, ClayCard, EmptyState, Skeleton } from '../components/ui';
import { ProfessorTestsView } from '../features/tests/management/ProfessorTestsView';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { filterTests } from '../lib/analytics';
import { computeEffectiveTestStatus } from '../lib/grading';
import { formatDateTime } from '../lib/utils';

export function TestsShellPage() {
  const user = useAuthStore((s) => s.user);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const workspaceError = useUIStore((s) => s.workspaceError);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const navigate = useNavigate();

  const isProfessor = user?.role === 'professor';

  const visibleStudentTests = useMemo(() => {
    const withStatus = tests
      .filter((t) => t.published)
      .map((t) => ({ ...t, status: computeEffectiveTestStatus(t) }));
    return filterTests(withStatus, 'all', searchQuery);
  }, [tests, searchQuery]);

  if (isProfessor) {
    return (
      <AppShell>
        <ProfessorTestsView />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            My Tests
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Published assessments you can join and attempt.
          </p>
        </div>

        {workspaceError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{workspaceError}</span>
          </div>
        )}

        {!testsLoaded ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : visibleStudentTests.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" aria-hidden="true" />}
            title={searchQuery.trim() ? 'No matching tests' : 'No published tests yet'}
            description={
              searchQuery.trim()
                ? `No assessments matched "${searchQuery.trim()}".`
                : 'Published tests from your professors will appear here, or enter a join code on your dashboard.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleStudentTests.map((item) => (
              <ClayCard key={item.id} interactive className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-bold text-[var(--accent-primary)]">
                      {item.code}
                    </span>
                    <ClayBadge
                      tone={
                        item.status === 'live'
                          ? 'mint'
                          : item.status === 'scheduled'
                            ? 'purple'
                            : 'neutral'
                      }
                      className="capitalize"
                    >
                      {item.status}
                    </ClayBadge>
                  </div>
                  <h2 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {item.subject} {item.professorName ? `· ${item.professorName}` : ''}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="clay-inset flex items-center justify-between rounded-[16px] px-3.5 py-2.5 text-xs text-[var(--text-muted)] tabular-nums">
                    <span>{formatDateTime(item.startTime)}</span>
                    <span>
                      {item.durationMinutes} min · {item.totalMarks} pts
                    </span>
                  </div>
                  <ClayButton
                    variant={item.status === 'live' ? 'primary' : 'secondary'}
                    size="sm"
                    className="w-full"
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    onClick={() => navigate(`/join/${item.code}`)}
                  >
                    {item.status === 'live' ? 'Join & Start' : 'Open Details'}
                  </ClayButton>
                </div>
              </ClayCard>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
