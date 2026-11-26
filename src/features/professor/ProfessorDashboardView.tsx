import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Radio,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Bell,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { attemptService } from '../../services/attemptService';
import { testService } from '../../services/testService';
import { triggerDemoWriteGuard } from '../demo';
import { computeProfessorStats, filterTests } from '../../lib/analytics';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { formatDateTime } from '../../lib/utils';
import type {
  IntegrityAlert,
  PerformancePoint,
  SubmissionSummary,
  TestItem,
  TestStatus,
} from '../../types';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  FeatureCard,
  IllustratedActionCard,
  Loader,
  Modal,
  ProgressBar,
  ProgressRing,
  Skeleton,
  StatChip,
} from '../../components/ui';
import {
  CreateTestIllustration,
  EmptyNotificationsIllustration,
  EmptySubmissionsIllustration,
  PromoIllustration,
  QuestionBankIllustration,
  ResultsIllustration,
} from '../../components/illustrations';
import { TestListCard } from '../../components/dashboard/TestListCard';
import { CalendarWidget } from '../../components/dashboard/CalendarWidget';
import { PerformanceChart } from '../../components/dashboard/PerformanceChart';

export function ProfessorDashboardView() {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const workspaceError = useUIStore((s) => s.workspaceError);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const notifications = useUIStore((s) => s.notifications);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);

  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [integrityAlerts, setIntegrityAlerts] = useState<IntegrityAlert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) {
      setDataLoading(false);
      return;
    }
    let active = true;
    setDataLoading(true);
    setDashboardError(null);

    void Promise.all([
      testService.getProfessorDashboardData(user.uid),
      attemptService.listProfessorIntegrityAlerts(user.uid).catch(() => [] as IntegrityAlert[]),
    ])
      .then(([res, alerts]) => {
        if (!active) return;
        setSubmissions(res.submissions);
        setPerformanceData(res.performanceTrend);
        setIntegrityAlerts(alerts);
        setDataLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setSubmissions([]);
        setPerformanceData([]);
        setIntegrityAlerts([]);
        setDashboardError(mapFirebaseError(err, 'Unable to load evaluation metrics.'));
        setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, isDemo]);

  const stats = useMemo(() => computeProfessorStats(tests), [tests]);
  const filteredTests = useMemo(
    () => filterTests(tests, statusFilter, searchQuery),
    [tests, statusFilter, searchQuery]
  );

  const pendingEvalCount = useMemo(
    () => submissions.filter((s) => s.status === 'pending_eval').length,
    [submissions]
  );
  const evaluatedRate = useMemo(() => {
    if (submissions.length === 0) return 0;
    const evaluated = submissions.filter((s) => s.status === 'evaluated').length;
    return Math.round((evaluated / submissions.length) * 100);
  }, [submissions]);

  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleCreateTest = () => {
    if (triggerDemoWriteGuard('create a test')) return;
    navigate('/professor/tests/new');
  };

  if (!testsLoaded || dataLoading) {
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
      <section aria-label="Workspace overview" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-5 lg:col-span-5">
          <div>
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              {user?.department || 'Professor Workspace'}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] text-balance sm:text-[28px]">
              Hi, {user?.firstName || 'Professor'}! What are your plans for today?
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {stats.totalTests === 0
                ? 'Launch your first assessment to start evaluating students.'
                : `${stats.activeTests} active assessments · ${pendingEvalCount} awaiting review`}
            </p>
          </div>

          {/* Unified soft-lavender StatChips */}
          <div className="grid grid-cols-2 gap-3">
            <StatChip
              label="Total Tests"
              value={stats.totalTests}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Active"
              value={stats.activeTests}
              icon={<Radio className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Students"
              value={stats.totalStudents}
              icon={<Users className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
            <StatChip
              label="Avg Score"
              value={stats.averageScore > 0 ? `${stats.averageScore}%` : '0%'}
              icon={<TrendingUp className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />}
            />
          </div>
        </div>

        {/* 3 Tall White Illustrated Action Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          <IllustratedActionCard
            illustration={<CreateTestIllustration size={108} />}
            title="Create Test"
            subtitle="Build timed or monitored assessments"
            onClick={handleCreateTest}
          />
          <IllustratedActionCard
            illustration={<QuestionBankIllustration size={108} />}
            title="Manage Tests"
            subtitle="Drafts, schedules & question bank"
            onClick={() => navigate('/professor/tests')}
          />
          <IllustratedActionCard
            illustration={<ResultsIllustration size={108} />}
            title="Results & Analytics"
            subtitle="Score trends & item difficulty"
            onClick={() => navigate('/professor/analytics')}
          />
        </div>
      </section>

      {/* ROW 2: Notifications | Live & Upcoming Tests | Calendar */}
      <section aria-label="Schedule and activity" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Column 1: Notifications */}
        <div className="min-w-0 lg:col-span-4">
          <ClayCard className="flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                    Notifications
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Recent alerts & grading updates
                  </p>
                </div>
                {unreadNotifs > 0 && (
                  <ClayBadge tone="mint" className="tabular-nums">
                    {unreadNotifs} New
                  </ClayBadge>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="mt-2">
                  <EmptyState
                    embedded
                    compact
                    illustration={<EmptyNotificationsIllustration size={120} />}
                    title="All caught up"
                    description="Submissions, exam alerts, and schedule reminders show up here."
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {notifications.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNotificationsOpen(true)}
                      className="flex w-full cursor-pointer items-start gap-3 rounded-[16px] bg-[var(--bg-surface-tinted)] px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {item.message}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="mt-4 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                <span>Open all notifications</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </ClayCard>
        </div>

        {/* Column 2: Live & Upcoming Tests */}
        <div className="min-w-0 lg:col-span-4">
          <TestListCard
            tests={filteredTests}
            totalCount={tests.length}
            activeStatus={statusFilter}
            onStatusChange={setStatusFilter}
            onSelectTest={(t) => setSelectedTest(t)}
            onCreateNew={handleCreateTest}
          />
        </div>

        {/* Column 3: Calendar with day agenda */}
        <div className="min-w-0 lg:col-span-4">
          <CalendarWidget tests={tests} title="Test Calendar" />
        </div>
      </section>

      {/* ROW 3: Recent Submissions | Purple FeatureCard | ProgressRings + Integrity Alerts */}
      <section aria-label="Grading and monitoring" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Column 1: Recent Submissions */}
        <div className="min-w-0 lg:col-span-4">
          <ClayCard className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
                  Recent Submissions
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Latest student hand-ins
                </p>
              </div>
              {pendingEvalCount > 0 && (
                <ClayBadge tone="amber" className="tabular-nums">
                  {pendingEvalCount} Pending
                </ClayBadge>
              )}
            </div>

            {submissions.length === 0 ? (
              <div className="mt-2 flex-1">
                <EmptyState
                  embedded
                  compact
                  illustration={<EmptySubmissionsIllustration size={126} />}
                  title="No submissions yet"
                  description="Student responses will appear here as soon as an assessment is submitted."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {submissions.slice(0, 4).map((sub) => {
                  const pct =
                    sub.score != null && sub.totalMarks > 0
                      ? Math.round((sub.score / sub.totalMarks) * 100)
                      : 0;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        navigate(`/professor/tests/${sub.testId}/submissions/${sub.id}`)
                      }
                      className="block w-full cursor-pointer space-y-2 rounded-[18px] bg-[var(--bg-surface-tinted)] px-4 py-3 text-left transition-all hover:bg-[var(--bg-surface-hover)] hover:shadow-[var(--shadow-clay-sm)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                            {sub.studentName}
                          </p>
                          <p className="truncate text-[11px] text-[var(--text-muted)]">
                            {sub.testTitle} · {formatDateTime(sub.submittedAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {sub.status === 'evaluated' ? (
                            <span className="text-xs font-extrabold text-[var(--text-primary)] tabular-nums">
                              {sub.score}/{sub.totalMarks}
                            </span>
                          ) : (
                            <ClayBadge tone="amber">Grade</ClayBadge>
                          )}
                        </div>
                      </div>
                      {sub.status === 'evaluated' && (
                        <ProgressBar
                          value={pct}
                          accent={pct >= 75 ? 'mint' : 'purple'}
                          label={`${sub.studentName} score`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ClayCard>
        </div>

        {/* Column 2: The ONE Purple FeatureCard */}
        <div className="min-w-0 lg:col-span-4">
          <FeatureCard
            eyebrow="AI Studio Preview"
            title="AI Question Generator"
            description="Draft balanced MCQs, rubrics, and topic-tagged short answers from lecture notes in seconds."
            actionLabel="Explore workflow"
            onAction={() => setAiPreviewOpen(true)}
            illustration={<PromoIllustration size={102} />}
            className="h-full"
          />
        </div>

        {/* Column 3: Two Compact ProgressRing Cards + Integrity Alerts */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-4">
          <div className="grid grid-cols-2 gap-4">
            <ClayCard padding="sm" className="flex flex-col items-center text-center">
              <ProgressRing
                value={evaluatedRate}
                size={68}
                strokeWidth={6}
                accent="purple"
                label="Evaluated submissions"
              />
              <p className="mt-2.5 text-xs font-bold text-[var(--text-primary)]">Graded</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {submissions.length} total
              </p>
            </ClayCard>

            <ClayCard padding="sm" className="flex flex-col items-center text-center">
              <ProgressRing
                value={Math.round(stats.averageScore)}
                size={68}
                strokeWidth={6}
                accent="mint"
                label="Class average score"
              />
              <p className="mt-2.5 text-xs font-bold text-[var(--text-primary)]">Class Avg</p>
              <p className="text-[11px] text-[var(--text-muted)]">All graded tests</p>
            </ClayCard>
          </div>

          {/* Integrity Alerts Card (Real Firestore data / Sample data in Demo Mode) */}
          <ClayCard data-testid="integrity-alerts-card" padding="sm" className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[var(--tile-lavender)] text-[var(--accent-primary)]">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Integrity Alerts
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">Monitored sessions</p>
                </div>
              </div>
              {isDemo ? (
                <ClayBadge tone="amber">Sample</ClayBadge>
              ) : integrityAlerts.length > 0 ? (
                <ClayBadge tone="coral" className="tabular-nums">
                  {integrityAlerts.filter((a) => !a.professorFlagCleared).length} Active
                </ClayBadge>
              ) : (
                <ClayBadge tone="mint">Clean</ClayBadge>
              )}
            </div>

            {integrityAlerts.length === 0 ? (
              <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-[var(--bg-surface-tinted)] px-3.5 py-3">
                <ShieldCheck
                  className="h-4 w-4 shrink-0 text-[var(--semantic-mint)]"
                  aria-hidden="true"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  All monitored sessions look clean. Logged warnings appear here.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {integrityAlerts.slice(0, 3).map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() =>
                      navigate(`/professor/tests/${alert.testId}/submissions/${alert.attemptId}`)
                    }
                    className="block w-full cursor-pointer rounded-[14px] bg-[var(--bg-surface-tinted)] px-3 py-2.5 text-left text-xs transition-colors hover:bg-[var(--bg-surface-hover)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold text-[var(--text-primary)]">
                        {alert.studentName}
                      </span>
                      <ClayBadge
                        tone={
                          alert.professorFlagCleared
                            ? 'mint'
                            : alert.riskLevel === 'high' || alert.professorFlagged
                              ? 'coral'
                              : 'amber'
                        }
                      >
                        {alert.professorFlagCleared
                          ? 'Cleared'
                          : alert.professorFlagged
                            ? 'Flagged'
                            : alert.riskLevel === 'high'
                              ? 'High'
                              : alert.riskLevel === 'medium'
                                ? 'Medium'
                                : 'Logged'}
                      </ClayBadge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
                      {alert.primaryReason} · {alert.integrityScore}%
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ClayCard>
        </div>
      </section>

      {/* ROW 4: Class Performance Trend */}
      <PerformanceChart data={performanceData} />

      {/* Selected Test Summary Modal */}
      <Modal
        open={Boolean(selectedTest)}
        onClose={() => setSelectedTest(null)}
        title={selectedTest?.title || 'Assessment Overview'}
        description={selectedTest?.subject}
      >
        {selectedTest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-[16px] bg-[var(--bg-surface-tinted)] p-3.5">
                <p className="text-[var(--text-muted)]">Join Code</p>
                <p className="mt-1 font-mono-tabular text-base font-bold text-[var(--text-primary)]">
                  {selectedTest.code}
                </p>
              </div>
              <div className="rounded-[16px] bg-[var(--bg-surface-tinted)] p-3.5">
                <p className="text-[var(--text-muted)]">Duration & Marks</p>
                <p className="mt-1 text-base font-bold tabular-nums text-[var(--text-primary)]">
                  {selectedTest.durationMinutes}m · {selectedTest.totalMarks} pts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Clock className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>
                {selectedTest.proctoring.enabled
                  ? `Monitored · Fullscreen ${
                      selectedTest.proctoring.fullscreenRequired ? 'required' : 'optional'
                    } · Limit ${selectedTest.proctoring.maxTabSwitches} warnings`
                  : 'Standard session (monitoring off)'}
              </span>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <ClayButton variant="ghost" size="sm" onClick={() => setSelectedTest(null)}>
                Close
              </ClayButton>
              <ClayButton
                variant="secondary"
                size="sm"
                leftIcon={<BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => {
                  const id = selectedTest.id;
                  setSelectedTest(null);
                  navigate(`/professor/tests/${id}/analytics`);
                }}
              >
                Analytics
              </ClayButton>
              <ClayButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  const id = selectedTest.id;
                  setSelectedTest(null);
                  navigate(`/professor/tests/${id}/edit`);
                }}
              >
                Edit Test
              </ClayButton>
              <ClayButton
                variant="navy"
                size="sm"
                onClick={() => {
                  const id = selectedTest.id;
                  setSelectedTest(null);
                  navigate(`/professor/tests/${id}/submissions`);
                }}
              >
                View Submissions
              </ClayButton>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Question Generator Preview Modal */}
      <Modal
        open={aiPreviewOpen}
        onClose={() => setAiPreviewOpen(false)}
        title="AI Question Generator"
        description="Scheduled for the upcoming AI Evaluation milestone"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Soon you will be able to upload a syllabus or topic outline to auto-draft MCQs,
            multiple-correct items, and grading rubrics directly into your Test Builder.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Today, you can create questions manually, bulk-import via CSV, and reuse items from your
            saved Question Bank.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <ClayButton variant="ghost" size="sm" onClick={() => setAiPreviewOpen(false)}>
              Close
            </ClayButton>
            <ClayButton
              variant="navy"
              size="sm"
              onClick={() => {
                setAiPreviewOpen(false);
                handleCreateTest();
              }}
            >
              Open Test Builder
            </ClayButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
