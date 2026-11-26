import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Clock,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  EmptyPerformanceIllustration,
  EmptySubmissionsIllustration,
} from '../../components/illustrations';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  computeClassComparison,
  computeTestAnalytics,
  serializeTestAnalyticsToCsv,
} from '../../lib/analytics';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { downloadTestAnalyticsPdf } from '../../lib/pdfExport';
import { downloadTextFile } from '../../lib/utils';
import { attemptService } from '../../services/attemptService';
import { testService } from '../../services/testService';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { PublicQuestion, TestAttempt } from '../../types';
import { StatCard } from '../../components/dashboard/StatCard';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
  ProgressBar,
} from '../../components/ui';

function formatAvgTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m 0s';
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
}

export function ProfessorAnalyticsView() {
  const { id: routeTestId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const pushToast = useUIStore((s) => s.pushToast);

  const [selectedTestId, setSelectedTestId] = useState<string>(routeTestId || '');
  const [allAttempts, setAllAttempts] = useState<TestAttempt[]>([]);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync route param -> selectedTestId
  useEffect(() => {
    if (routeTestId) {
      setSelectedTestId(routeTestId);
    }
  }, [routeTestId]);

  // Default to first test with submissions (or first test) when no routeTestId
  useEffect(() => {
    if (selectedTestId || tests.length === 0) return;
    const withSubs = tests.find((t) =>
      allAttempts.some((a) => a.testId === t.id && a.status !== 'in_progress')
    );
    setSelectedTestId((withSubs ?? tests[0]).id);
  }, [selectedTestId, tests, allAttempts]);

  // Load all attempts for this professor (used for both Class Comparison & Per-Test analytics)
  useEffect(() => {
    if (!user?.uid) {
      setLoadingAttempts(false);
      return;
    }
    let active = true;
    setLoadingAttempts(true);
    setError(null);

    void attemptService
      .listAllProfessorAttempts(user.uid)
      .then((attempts) => {
        if (!active) return;
        setAllAttempts(attempts);
        setLoadingAttempts(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(mapFirebaseError(err, 'Unable to load analytics data.'));
        setLoadingAttempts(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, isDemo]);

  // Load questions for the selected test (needed for question-wise accuracy & hardest questions)
  useEffect(() => {
    if (!selectedTestId) {
      setQuestions([]);
      return;
    }
    let active = true;
    setLoadingQuestions(true);

    void testService
      .getTestQuestionsPublic(selectedTestId)
      .then((qs) => {
        if (!active) return;
        setQuestions(qs);
        setLoadingQuestions(false);
      })
      .catch(() => {
        if (!active) return;
        setQuestions([]);
        setLoadingQuestions(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTestId]);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) ?? null,
    [tests, selectedTestId]
  );

  const selectedTestAttempts = useMemo(
    () => allAttempts.filter((a) => a.testId === selectedTestId),
    [allAttempts, selectedTestId]
  );

  const perTestAnalytics = useMemo(() => {
    if (!selectedTest) return null;
    return computeTestAnalytics(selectedTest, questions, selectedTestAttempts);
  }, [selectedTest, questions, selectedTestAttempts]);

  const classComparison = useMemo(
    () => computeClassComparison(tests, allAttempts),
    [tests, allAttempts]
  );

  const handleExportCsv = () => {
    if (!perTestAnalytics) return;
    const csv = serializeTestAnalyticsToCsv(perTestAnalytics, selectedTestAttempts);
    const slug = perTestAnalytics.testTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    downloadTextFile(`evalynx-${slug || 'test'}-analytics.csv`, csv, 'text/csv;charset=utf-8');
    pushToast({
      title: 'CSV exported',
      description: `Downloaded analytics report for "${perTestAnalytics.testTitle}".`,
      tone: 'success',
    });
  };

  const handleExportPdf = () => {
    if (!perTestAnalytics) return;
    downloadTestAnalyticsPdf(perTestAnalytics, selectedTestAttempts);
    pushToast({
      title: 'PDF exported',
      description: `Downloaded PDF report for "${perTestAnalytics.testTitle}".`,
      tone: 'success',
    });
  };

  if (!testsLoaded || loadingAttempts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {routeTestId && (
            <ClayButton
              variant="icon"
              size="sm"
              aria-label="Back to submissions"
              onClick={() => navigate(`/professor/tests/${routeTestId}/submissions`)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </ClayButton>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Analytics &amp; Insights
              </h1>
              {isDemo && <ClayBadge tone="amber">Sample Data</ClayBadge>}
            </div>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Per-test performance breakdown, question difficulty, and class comparison across
              assessments.
            </p>
          </div>
        </div>

        {perTestAnalytics && (
          <div className="flex flex-wrap items-center gap-2.5">
            <ClayButton
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
              onClick={handleExportCsv}
              data-testid="export-csv-btn"
            >
              Export CSV
            </ClayButton>
            <ClayButton
              variant="navy"
              size="sm"
              leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
              onClick={handleExportPdf}
              data-testid="export-pdf-btn"
            >
              Export PDF
            </ClayButton>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {tests.length === 0 ? (
        <ClayCard>
          <EmptyState
            embedded
            illustration={<EmptyPerformanceIllustration size={140} />}
            title="No assessments to analyze yet"
            description="Create and publish an assessment to unlock score distributions, question accuracy, and class comparison charts."
            actionLabel="Create Test"
            onAction={() => navigate('/professor/tests/new')}
          />
        </ClayCard>
      ) : (
        <>
          {/* Class Comparison Across Tests */}
          <ClayCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Class Comparison Across Tests
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Compare average percentage, highest score, and pass rate across assessments with
                  submissions
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]"
                      aria-hidden="true"
                    />
                    Avg %
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-mint)]"
                      aria-hidden="true"
                    />
                    Highest %
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[var(--accent-secondary)]"
                      aria-hidden="true"
                    />
                    Pass %
                  </span>
                </div>
                <ClayBadge tone="purple" className="tabular-nums">
                  {classComparison.length}{' '}
                  {classComparison.length === 1 ? 'Test Analyzed' : 'Tests Analyzed'}
                </ClayBadge>
              </div>
            </div>

            {classComparison.length === 0 ? (
              <EmptyState
                embedded
                compact
                illustration={<EmptyPerformanceIllustration size={132} />}
                title="No class comparison data yet"
                description="Once students submit one or more tests, average scores and pass rates across your assessments will compare here."
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparison} margin={{ top: 8, right: 12, left: -14, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis
                      dataKey="testShortName"
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        boxShadow: 'var(--shadow-clay-sm)',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Bar
                      dataKey="averagePercent"
                      name="Average %"
                      fill="#6C5CE7"
                      radius={[10, 10, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="highestPercent"
                      name="Highest %"
                      fill="#5CC9A7"
                      radius={[10, 10, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="passRate"
                      name="Pass %"
                      fill="#A89CF5"
                      radius={[10, 10, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ClayCard>

          {/* Test Selector for Per-Test Drilldown */}
          <ClayCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Per-Test Drilldown
              </p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {selectedTest?.title || 'Select an assessment'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Select test for analytics"
                value={selectedTestId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedTestId(nextId);
                  if (routeTestId) {
                    navigate(`/professor/tests/${nextId}/analytics`, { replace: true });
                  }
                }}
                className="clay-inset rounded-[16px] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              >
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.code})
                  </option>
                ))}
              </select>

              {selectedTest && (
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/professor/tests/${selectedTest.id}/submissions`)}
                >
                  View Submissions
                </ClayButton>
              )}
            </div>
          </ClayCard>

          {perTestAnalytics && (
            <>
              {/* Per-Test KPI Strip */}
              <section
                aria-label="Per-test KPI metrics"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
              >
                <StatCard
                  label="Average Score"
                  value={`${perTestAnalytics.averagePercent}%`}
                  subtext={`${perTestAnalytics.averageMarks} / ${perTestAnalytics.totalMarks} marks`}
                  icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
                  accent="purple"
                />
                <StatCard
                  label="Highest / Lowest"
                  value={`${perTestAnalytics.highestPercent}% / ${perTestAnalytics.lowestPercent}%`}
                  subtext={`${perTestAnalytics.highestMarks} high · ${perTestAnalytics.lowestMarks} low`}
                  icon={<Award className="h-5 w-5" aria-hidden="true" />}
                  accent="mint"
                />
                <StatCard
                  label="Pass Rate"
                  value={`${perTestAnalytics.passRate}%`}
                  subtext={`${perTestAnalytics.submissionCount} ${
                    perTestAnalytics.submissionCount === 1 ? 'submission' : 'submissions'
                  }`}
                  icon={<Users className="h-5 w-5" aria-hidden="true" />}
                  accent="mint"
                />
                <StatCard
                  label="Average Time"
                  value={formatAvgTime(perTestAnalytics.averageTimeSeconds)}
                  subtext={`Limit ${selectedTest?.durationMinutes ?? 0}m`}
                  icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                  accent="amber"
                />
                <StatCard
                  label="Integrity Flags"
                  value={perTestAnalytics.highRiskCount + perTestAnalytics.flaggedCount}
                  subtext={`${perTestAnalytics.highRiskCount} high risk · ${perTestAnalytics.flaggedCount} flagged`}
                  icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
                  accent="amber"
                />
              </section>

              {/* Score Distribution + Hardest Questions */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <ClayCard className="space-y-4 lg:col-span-7">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Score Distribution
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        Student counts grouped across 20% score bands
                      </p>
                    </div>
                    <ClayBadge tone="neutral" className="tabular-nums">
                      n = {perTestAnalytics.submissionCount}
                    </ClayBadge>
                  </div>

                  {perTestAnalytics.submissionCount === 0 ? (
                    <EmptyState
                      embedded
                      compact
                      illustration={<EmptyPerformanceIllustration size={126} />}
                      title="No submissions for this test yet"
                      description="Score distribution bars will populate automatically as students complete this assessment."
                    />
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={perTestAnalytics.scoreDistribution}
                          margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                          <XAxis
                            dataKey="range"
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '16px',
                              boxShadow: 'var(--shadow-clay-sm)',
                              fontSize: '12px',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="Students"
                            fill="#6C5CE7"
                            radius={[12, 12, 0, 0]}
                            isAnimationActive={false}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </ClayCard>

                {/* Hardest Questions */}
                <ClayCard className="space-y-4 lg:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Hardest Questions
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        Lowest accuracy items to revisit in class
                      </p>
                    </div>
                    <AlertTriangle
                      className="h-4 w-4 text-[var(--semantic-coral)]"
                      aria-hidden="true"
                    />
                  </div>

                  {loadingQuestions ? (
                    <div className="flex justify-center py-10">
                      <Loader size="sm" />
                    </div>
                  ) : perTestAnalytics.hardestQuestions.length === 0 ? (
                    <EmptyState
                      embedded
                      compact
                      illustration={<EmptySubmissionsIllustration size={120} />}
                      title="No graded responses yet"
                      description="Once students submit answers, the most missed questions will surface here."
                    />
                  ) : (
                    <div className="space-y-3" data-testid="hardest-questions-list">
                      {perTestAnalytics.hardestQuestions.map((q) => (
                        <div
                          key={q.questionId}
                          className="clay-inset space-y-2 rounded-[18px] p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <ClayBadge tone="purple">Q{q.questionNumber}</ClayBadge>
                              <ClayBadge tone="neutral">{q.topic}</ClayBadge>
                            </div>
                            <ClayBadge
                              tone={
                                q.accuracyPercent < 50
                                  ? 'coral'
                                  : q.accuracyPercent < 75
                                    ? 'amber'
                                    : 'mint'
                              }
                              className="tabular-nums"
                            >
                              {q.accuracyPercent}% accuracy
                            </ClayBadge>
                          </div>
                          <p className="line-clamp-2 font-semibold text-[var(--text-primary)]">
                            {q.prompt}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {q.correctCount} correct · {q.wrongCount} wrong · {q.skippedCount}{' '}
                            skipped
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ClayCard>
              </div>

              {/* Question-Wise Accuracy Table */}
              <ClayCard padding="none" className="overflow-hidden">
                <div className="px-6 pb-3 pt-5">
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    Question-Wise Accuracy
                  </h2>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    Detailed outcome breakdown across all {perTestAnalytics.questionStats.length}{' '}
                    questions in this assessment
                  </p>
                </div>

                {loadingQuestions ? (
                  <div className="flex justify-center py-12">
                    <Loader size="sm" />
                  </div>
                ) : perTestAnalytics.questionStats.length === 0 ? (
                  <div className="px-6 pb-10 pt-4 text-center text-xs text-[var(--text-muted)]">
                    This assessment has no questions configured yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      className="w-full min-w-[700px] text-left text-xs"
                      data-testid="question-accuracy-table"
                    >
                      <thead>
                        <tr className="font-bold text-[var(--text-muted)]">
                          <th className="px-6 py-3.5">Q#</th>
                          <th className="px-4 py-3.5">Question &amp; Topic</th>
                          <th className="px-4 py-3.5">Difficulty</th>
                          <th className="px-4 py-3.5 text-right">Correct</th>
                          <th className="px-4 py-3.5 text-right">Wrong</th>
                          <th className="px-4 py-3.5 text-right">Skipped</th>
                          <th className="px-6 py-3.5">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--bg-surface-muted)]">
                        {perTestAnalytics.questionStats.map((q) => (
                          <tr
                            key={q.questionId}
                            className="transition-colors hover:bg-[var(--bg-surface-muted)]/35"
                          >
                            <td className="px-6 py-3.5 font-extrabold text-[var(--accent-primary)] tabular-nums">
                              Q{q.questionNumber}
                            </td>
                            <td className="max-w-md px-4 py-3.5">
                              <p className="line-clamp-1 font-semibold text-[var(--text-primary)]">
                                {q.prompt}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                                {q.topic} · {q.type.replace('_', ' ')} · {q.maxMarks} pts
                              </p>
                            </td>
                            <td className="px-4 py-3.5">
                              <ClayBadge
                                tone={
                                  q.difficulty === 'hard'
                                    ? 'coral'
                                    : q.difficulty === 'medium'
                                      ? 'amber'
                                      : 'mint'
                                }
                                className="capitalize"
                              >
                                {q.difficulty}
                              </ClayBadge>
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-[var(--semantic-mint-text)] tabular-nums">
                              {q.correctCount}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-[var(--semantic-coral-text)] tabular-nums">
                              {q.wrongCount}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-[var(--text-muted)] tabular-nums">
                              {q.skippedCount}
                            </td>
                            <td className="w-44 px-6 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex-1">
                                  <ProgressBar
                                    value={q.accuracyPercent}
                                    accent={
                                      q.accuracyPercent >= 75
                                        ? 'mint'
                                        : q.accuracyPercent >= 50
                                          ? 'amber'
                                          : 'purple'
                                    }
                                    label={`Question ${q.questionNumber} accuracy`}
                                  />
                                </div>
                                <span className="w-10 text-right font-extrabold text-[var(--text-primary)] tabular-nums">
                                  {q.accuracyPercent}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ClayCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
