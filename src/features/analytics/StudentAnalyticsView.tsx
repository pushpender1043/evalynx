import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import { EmptyPerformanceIllustration } from '../../components/illustrations';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeStudentAnalytics } from '../../lib/analytics';
import { mapFirebaseError } from '../../lib/firebaseErrors';
import { testService } from '../../services/testService';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { StudentResultItem } from '../../types';
import { StatCard } from '../../components/dashboard/StatCard';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
  ProgressRing,
} from '../../components/ui';

export function StudentAnalyticsView() {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const tests = useUIStore((s) => s.tests);
  const testsLoaded = useUIStore((s) => s.testsLoaded);
  const navigate = useNavigate();

  const [results, setResults] = useState<StudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !testsLoaded) return;
    let active = true;
    setLoading(true);
    setError(null);

    void testService
      .getStudentAnalyticsResults(user.uid, tests)
      .then((items) => {
        if (!active) return;
        setResults(items);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setResults([]);
        setError(mapFirebaseError(err, 'Unable to load your analytics right now.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, tests, testsLoaded, isDemo]);

  const analytics = useMemo(() => computeStudentAnalytics(results), [results]);

  const bestScore = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.max(...results.map((r) => r.percentage));
  }, [results]);

  const rankedEntries = useMemo(
    () => results.filter((r) => Boolean(r.showRank) && r.rank > 0 && r.totalStudents > 0),
    [results]
  );

  if (!testsLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              My Performance Analytics
            </h1>
            {isDemo && <ClayBadge tone="amber">Sample Data</ClayBadge>}
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Track score progression, topic mastery from question tags, focus areas, and enabled
            class rankings.
          </p>
        </div>

        <ClayButton
          variant="secondary"
          size="sm"
          onClick={() => navigate('/student/tests')}
        >
          Browse Assessments
        </ClayButton>
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

      {/* Summary KPIs */}
      <section aria-label="Student summary metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tests Completed"
          value={results.length}
          subtext={results.length === 0 ? 'Join a test to begin' : 'Submitted assessments'}
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />}
          accent="purple"
        />
        <StatCard
          label="Average Score"
          value={`${analytics.averagePercentage}%`}
          subtext={results.length > 0 ? 'Across all results' : 'No scores yet'}
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          accent="mint"
        />
        <StatCard
          label="Best Score"
          value={`${bestScore}%`}
          subtext={results.length > 0 ? 'Personal highest' : 'Awaiting first result'}
          icon={<Award className="h-5 w-5" aria-hidden="true" />}
          accent="mint"
        />
        <StatCard
          label="Weak Topics"
          value={analytics.weakTopics.length}
          subtext="Topics below 70% accuracy"
          icon={<Target className="h-5 w-5" aria-hidden="true" />}
          accent="amber"
        />
      </section>

      {/* Progress Over Time Chart */}
      <ClayCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Progress Over Time</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Chronological percentage score trend across completed assessments
            </p>
          </div>
          <ClayBadge tone="purple" className="tabular-nums">
            {analytics.progressOverTime.length}{' '}
            {analytics.progressOverTime.length === 1 ? 'Test' : 'Tests'}
          </ClayBadge>
        </div>

        {analytics.progressOverTime.length === 0 ? (
          <EmptyState
            embedded
            compact
            illustration={<EmptyPerformanceIllustration size={132} />}
            title="No assessment history yet"
            description="Complete your first assessment to see your score progression chart over time."
          />
        ) : (
          <div className="h-64 w-full" data-testid="student-progress-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.progressOverTime}
                margin={{ top: 10, right: 16, left: -14, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="studentProgressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="percentage"
                  name="Score %"
                  stroke="#6C5CE7"
                  strokeWidth={2.5}
                  fill="url(#studentProgressGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ClayCard>

      {/* Topic-Wise Performance Rings + Weak Topics & Ranks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Topic-Wise Rings */}
        <ClayCard className="space-y-4 lg:col-span-7">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Topic-Wise Performance
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Accuracy rings computed from question topic tags across your completed tests
            </p>
          </div>

          {analytics.topicMastery.length === 0 ? (
            <EmptyState
              embedded
              compact
              illustration={<EmptyPerformanceIllustration size={126} />}
              title="No topic data yet"
              description="Topic performance rings appear automatically once you complete graded assessments."
            />
          ) : (
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              data-testid="student-topic-rings"
            >
              {analytics.topicMastery.map((topic, idx) => (
                <div
                  key={topic.id}
                  className="flex items-center gap-4 rounded-[20px] bg-[var(--bg-surface-tinted)] p-4"
                >
                  <ProgressRing
                    value={topic.masteryPercent}
                    size={64}
                    strokeWidth={6}
                    accent={idx % 2 === 0 ? 'purple' : 'mint'}
                    label={topic.topic}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {topic.topic}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{topic.subject}</p>
                    <p className="mt-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                      Seen in {topic.testsTaken} {topic.testsTaken === 1 ? 'test' : 'tests'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ClayCard>

        {/* Right Column: Weak Topics + Rank Among Test Takers */}
        <div className="space-y-6 lg:col-span-5">
          {/* Weak Topics */}
          <ClayCard className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Weak Topics</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Tagged topics below 70% accuracy to focus your study
                </p>
              </div>
              <AlertTriangle
                className="h-4 w-4 text-[var(--semantic-amber)]"
                aria-hidden="true"
              />
            </div>

            {results.length === 0 ? (
              <div className="clay-inset rounded-[18px] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                Complete an assessment to identify weak topics automatically.
              </div>
            ) : analytics.weakTopics.length === 0 ? (
              <div className="clay-inset flex items-center gap-3 rounded-[18px] px-4 py-5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-[var(--semantic-mint)]"
                  aria-hidden="true"
                />
                <span>
                  No weak topics detected — you are scoring 70% or higher across all tagged topics.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5" data-testid="student-weak-topics">
                {analytics.weakTopics.map((wt) => (
                  <div
                    key={wt.topic}
                    className="clay-inset flex items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--text-primary)]">{wt.topic}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {wt.subject} · Practice ~{wt.recommendedQuestions} questions
                      </p>
                    </div>
                    <ClayBadge tone={wt.accuracyPercent < 45 ? 'coral' : 'amber'} className="tabular-nums">
                      {wt.accuracyPercent}%
                    </ClayBadge>
                  </div>
                ))}
              </div>
            )}
          </ClayCard>

          {/* Rank Among Test Takers (Only when professor enabled showRankToStudents) */}
          <ClayCard className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Rank Among Test Takers
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Shown only for assessments where your professor enabled class ranking
                </p>
              </div>
              <Award className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>

            {rankedEntries.length === 0 ? (
              <div className="clay-inset rounded-[18px] px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                No rankings available yet. Rankings appear when a professor enables rank visibility
                on a completed assessment.
              </div>
            ) : (
              <div className="space-y-2.5" data-testid="student-rank-list">
                {rankedEntries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/student/results/${item.id}`)}
                    className="clay-inset flex w-full cursor-pointer items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-xs transition-transform hover:-translate-y-0.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--text-primary)]">
                        {item.testTitle}
                      </p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        Score: {item.score}/{item.totalMarks} ({item.percentage}%)
                      </p>
                    </div>
                    <ClayBadge tone="purple" className="tabular-nums">
                      #{item.rank} of {item.totalStudents}
                    </ClayBadge>
                  </button>
                ))}
              </div>
            )}
          </ClayCard>
        </div>
      </div>
    </div>
  );
}
