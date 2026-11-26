import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { testService } from '../../services/testService';
import { filterTests } from '../../lib/analytics';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { formatDateTime } from '../../lib/utils';
import type { StudentResultItem, TopicMastery } from '../../types';
import {
  ClayBadge,
  ClayCard,
  EmptyState,
  FeatureCard,
  IllustratedActionCard,
  Loader,
  ProgressBar,
  Skeleton,
  StatChip,
} from '../../components/ui';
import {
  EmptyNotificationsIllustration,
  EmptySubmissionsIllustration,
  EmptyTestsIllustration,
  JoinWithCodeIllustration,
  PracticeModeIllustration,
  PromoIllustration,
  ResultsIllustration,
} from '../../components/illustrations';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import { TopicProgressCard } from '../../components/dashboard/TopicProgressCard';
import { UpcomingTestRow } from './UpcomingTestRow';
import { JoinTestCard } from './JoinTestCard';

export function StudentDashboardView() {
  const user = useAuthStore((s) => s.user);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const workspaceError = useUIStore((s) => s.workspaceError);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const notifications = useUIStore((s) => s.notifications);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);

  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [recentResults, setRecentResults] = useState<StudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setDashboardError(null);

    void testService
      .getStudentDashboardData(user.uid)
      .then((res) => {
        if (!active) return;
        setTopicMastery(res.topicMastery);
        setRecentResults(res.recentResults);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setTopicMastery([]);
        setRecentResults([]);
        setDashboardError(mapFirebaseError(err, 'Unable to load your assessment history.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const upcomingTests = useMemo(() => {
    const activeOnly = tests.filter((t) => t.status === 'live' || t.status === 'scheduled');
    return filterTests(activeOnly, 'all', searchQuery);
  }, [tests, searchQuery]);

  const averagePct = useMemo(() => {
    if (recentResults.length === 0) return 0;
    const total = recentResults.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round(total / recentResults.length);
  }, [recentResults]);

  const focusJoinInput = () => {
    const el = document.getElementById('join-code-input');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => el.focus(), 160);
    }
  };

  if (!testsLoaded || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader size="md" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Skeleton className="h-52 lg:col-span-5" />
          <Skeleton className="h-52 lg:col-span-7" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const activeError = workspaceError || dashboardError;

  return (
    <div className="space-y-6">
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{activeError}</span>
        </div>
      )}

      {/* ROW 1: Greeting + Compact StatChips | 3 Tall Illustrated Action Cards */}
      <section aria-label="Student overview" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-5 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              {user?.department || 'Student Workspace'}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] text-balance sm:text-[28px]">
              Hi, {user?.firstName || 'Student'}! What are your plans for today?
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {upcomingTests.length === 0
                ? 'Enter a join code or browse scheduled assessments from your courses.'
                : `${upcomingTests.length} upcoming ${
                    upcomingTests.length === 1 ? 'assessment' : 'assessments'
                  } on your radar.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatChip
              label="Upcoming"
              value={upcomingTests.length}
              icon={<CalendarClock className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Completed"
              value={recentResults.length}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Avg Score"
              value={averagePct > 0 ? `${averagePct}%` : '0%'}
              icon={<TrendingUp className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Topics"
              value={topicMastery.length}
              icon={<BookOpen className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
          </div>
        </div>

        {/* 3 Tall White Illustrated Action Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          <IllustratedActionCard
            illustration={<JoinWithCodeIllustration size={108} />}
            title="Join with Code"
            subtitle="Enter a 6-character exam code"
            onClick={focusJoinInput}
          />
          <IllustratedActionCard
            illustration={<PracticeModeIllustration size={108} />}
            title="Browse Tests"
            subtitle="View active & past assessments"
            onClick={() => navigate('/student/tests')}
          />
          <IllustratedActionCard
            illustration={<ResultsIllustration size={108} />}
            title="My Results"
            subtitle="Progress trends & weak topics"
            onClick={() => navigate('/student/analytics')}
          />
        </div>
      </section>

      {/* ROW 2: Join + Notifications | Upcoming & Live Tests | Exam Calendar */}
      <section aria-label="Upcoming schedule" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Col 1: Join Card + Compact Notifications */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-4">
          <JoinTestCard onTestMatched={(test) => navigate(`/join/${test.code}`)} />

          <ClayCard className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                Notifications
              </h2>
              {notifications.filter((n) => !n.read).length > 0 && (
                <ClayBadge tone="mint">
                  {notifications.filter((n) => !n.read).length} New
                </ClayBadge>
              )}
            </div>

            {notifications.length === 0 ? (
              <EmptyState
                embedded
                compact
                illustration={<EmptyNotificationsIllustration size={104} />}
                title="All caught up"
                description="Score releases and schedule notices appear here."
              />
            ) : (
              <div className="mt-3 space-y-2">
                {notifications.slice(0, 2).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNotificationsOpen(true)}
                    className="flex w-full cursor-pointer items-start gap-2.5 rounded-[14px] bg-[var(--bg-surface-tinted)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
                      <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">
                        {item.message}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ClayCard>
        </div>

        {/* Col 2: Upcoming & Live Tests */}
        <div className="min-w-0 lg:col-span-4">
          <ClayCard className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                  Upcoming & Live Tests
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Scheduled exams from your courses
                </p>
              </div>
              <ClayBadge tone="purple" className="tabular-nums">
                {upcomingTests.length}
              </ClayBadge>
            </div>

            <div className="mt-4 flex-1 space-y-3">
              {upcomingTests.length === 0 ? (
                <EmptyState
                  embedded
                  compact
                  illustration={<EmptyTestsIllustration size={126} />}
                  title="No upcoming tests"
                  description="When a professor schedules or launches a test, it will appear here automatically."
                />
              ) : (
                upcomingTests.slice(0, 4).map((t) => (
                  <UpcomingTestRow
                    key={t.id}
                    test={t}
                    onJoin={(item) => navigate(`/join/${item.code}`)}
                  />
                ))
              )}
            </div>
          </ClayCard>
        </div>

        {/* Col 3: Exam Calendar */}
        <div className="min-w-0 lg:col-span-4">
          <CalendarWidget tests={tests} title="Exam Calendar" />
        </div>
      </section>

      {/* ROW 3: Recent Results | Purple FeatureCard | Topic Mastery */}
      <section aria-label="Results and mastery" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Col 1: Recent Results */}
        <div className="min-w-0 lg:col-span-4">
          <ClayCard className="flex h-full flex-col">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                Recent Results
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Your evaluated assessment scores
              </p>
            </div>

            {recentResults.length === 0 ? (
              <div className="mt-2 flex-1">
                <EmptyState
                  embedded
                  compact
                  illustration={<EmptySubmissionsIllustration size={126} />}
                  title="No results yet"
                  description="Completed and graded assessments will appear here with score breakdowns."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentResults.slice(0, 4).map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => navigate(`/student/results/${res.id}`)}
                    className="block w-full cursor-pointer space-y-2 rounded-[18px] bg-[var(--bg-surface-tinted)] p-3.5 text-left transition-all hover:bg-[var(--bg-surface-hover)] hover:shadow-[var(--shadow-clay-sm)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-bold text-[var(--text-primary)]">
                          <span className="truncate">{res.testTitle}</span>
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]"
                            aria-hidden="true"
                          />
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-muted)]">
                          {res.subject} · {formatDateTime(res.date)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-extrabold text-[var(--accent-primary)] tabular-nums">
                        {res.percentage}%
                      </span>
                    </div>
                    <ProgressBar
                      value={res.percentage}
                      accent={res.percentage >= 75 ? 'mint' : 'purple'}
                      label={`${res.testTitle} score`}
                    />
                  </button>
                ))}
              </div>
            )}
          </ClayCard>
        </div>

        {/* Col 2: The ONE Purple FeatureCard */}
        <div className="min-w-0 lg:col-span-4">
          <FeatureCard
            eyebrow="Study Insights"
            title="Pinpoint Weak Topics"
            description="Review your score trend over time and focus study hours on topics that lift your accuracy fastest."
            actionLabel="Open My Results"
            onAction={() => navigate('/student/analytics')}
            illustration={<PromoIllustration size={102} />}
            className="h-full"
          />
        </div>

        {/* Col 3: Topic Mastery ProgressRings */}
        <div className="min-w-0 lg:col-span-4">
          <TopicProgressCard topics={topicMastery} />
        </div>
      </section>
    </div>
  );
}
