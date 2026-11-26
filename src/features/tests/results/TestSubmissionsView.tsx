import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ClipboardCheck,
  Search,
} from 'lucide-react';
import { EmptyStudentsIllustration } from '../../../components/illustrations';
import type { TestAttempt, TestItem } from '../../../types';
import { attemptService } from '../../../services/attemptService';
import { testService } from '../../../services/testService';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn, formatDateTime } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { ClayBadge, ClayButton, ClayCard, Loader } from '../../../components/ui';

type SortField = 'submittedAt' | 'score' | 'timeTaken';

function formatDurationSeconds(sec?: number): string {
  if (!sec || sec <= 0) return '—';
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
}

export function TestSubmissionsView() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [test, setTest] = useState<TestItem | null>(null);
  const [submissions, setSubmissions] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated' | 'in_progress'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<SortField>('submittedAt');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    if (!testId || !user) return;
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      testService.getTestById(testId),
      attemptService.listTestSubmissions(testId, user.uid),
    ])
      .then(([testDoc, attempts]) => {
        if (!active) return;
        setTest(testDoc);
        setSubmissions(attempts);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(mapFirebaseError(err, 'Unable to load submissions.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [testId, user]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDesc((v) => !v);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = submissions.filter((s) => {
      const isPending =
        s.status !== 'in_progress' && (s.pendingReviewCount > 0 || s.status !== 'evaluated');
      if (statusFilter === 'pending' && !isPending) return false;
      if (statusFilter === 'evaluated' && s.status !== 'evaluated') return false;
      if (statusFilter === 'in_progress' && s.status !== 'in_progress') return false;
      if (!q) return true;
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.studentEmail.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'score') {
        diff = a.score - b.score;
      } else if (sortBy === 'timeTaken') {
        diff = (a.timeTakenSeconds ?? 0) - (b.timeTakenSeconds ?? 0);
      } else {
        diff = (a.submittedAtMs ?? a.startedAtMs) - (b.submittedAtMs ?? b.startedAtMs);
      }
      return sortDesc ? -diff : diff;
    });
  }, [submissions, search, statusFilter, sortBy, sortDesc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClayButton
            variant="icon"
            size="sm"
            onClick={() => navigate('/professor/tests')}
            aria-label="Back to tests"
          >
            <ArrowLeft className="h-4 w-4" />
          </ClayButton>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              {test?.title || 'Test'} — Submissions
            </h1>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {submissions.length} total {submissions.length === 1 ? 'attempt' : 'attempts'} · Code{' '}
              <strong className="font-mono-tabular text-[var(--accent-primary)]">
                {test?.code || '—'}
              </strong>
            </p>
          </div>
        </div>

        {test && (
          <div className="flex flex-wrap items-center gap-2">
            <ClayButton
              variant="secondary"
              size="sm"
              leftIcon={<BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => navigate(`/professor/tests/${test.id}/analytics`)}
            >
              Analytics
            </ClayButton>
            <ClayButton
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/professor/tests/${test.id}/edit`)}
            >
              Edit Test
            </ClayButton>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search, Filter & Sort Controls */}
      <ClayCard className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="clay-inset relative flex flex-1 items-center lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name or email..."
            aria-label="Search submissions"
            className="h-10 w-full rounded-[18px] bg-transparent pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending review' },
              { id: 'evaluated', label: 'Evaluated' },
              { id: 'in_progress', label: 'In progress' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                statusFilter === f.id
                  ? 'clay-btn-primary text-white'
                  : 'clay-surface-sm text-[var(--text-secondary)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </ClayCard>

      {/* Submissions Table */}
      <ClayCard padding="none" className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <EmptyStudentsIllustration size={132} />
            <p className="mt-3 text-base font-bold text-[var(--text-primary)]">
              No submissions yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
              Share join code <strong className="font-mono-tabular text-[var(--text-primary)]">{test?.code}</strong> with
              students. Submitted attempts will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold text-[var(--text-muted)]">
                  <th className="px-5 py-4">Student</th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('score')}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-[var(--text-primary)]"
                    >
                      Score <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('timeTaken')}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-[var(--text-primary)]"
                    >
                      Time Taken <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Integrity</th>
                  <th className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('submittedAt')}
                      className="inline-flex cursor-pointer items-center gap-1 hover:text-[var(--text-primary)]"
                    >
                      Submitted <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bg-surface-muted)]">
                {filtered.map((sub) => {
                  const needsReview =
                    sub.status !== 'in_progress' &&
                    (sub.pendingReviewCount > 0 || sub.status !== 'evaluated');
                  return (
                    <tr
                      key={sub.id}
                      className="transition-colors hover:bg-[var(--bg-surface-muted)]/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-[var(--text-primary)]">{sub.studentName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{sub.studentEmail}</p>
                      </td>
                      <td className="px-4 py-4 tabular-nums">
                        <span className="font-extrabold text-[var(--text-primary)]">
                          {sub.score} / {sub.totalMarks}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-[var(--accent-primary)]">
                          ({sub.percentage}%)
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                        {formatDurationSeconds(sub.timeTakenSeconds)}
                      </td>
                      <td className="px-4 py-4">
                        {sub.status === 'in_progress' ? (
                          <ClayBadge tone="purple">In progress</ClayBadge>
                        ) : needsReview ? (
                          <ClayBadge tone="amber">
                            Pending review ({sub.pendingReviewCount})
                          </ClayBadge>
                        ) : (
                          <ClayBadge tone="mint">Evaluated</ClayBadge>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ClayBadge
                            tone={
                              sub.riskLevel === 'high'
                                ? 'coral'
                                : sub.riskLevel === 'medium'
                                  ? 'amber'
                                  : 'mint'
                            }
                          >
                            {sub.riskLevel === 'high'
                              ? 'High Risk'
                              : sub.riskLevel === 'medium'
                                ? 'Medium'
                                : 'Low'}{' '}
                            · {sub.violationCount ?? 0}
                          </ClayBadge>
                          {sub.professorFlagged && !sub.professorFlagCleared && (
                            <ClayBadge tone="coral">Flagged</ClayBadge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--text-muted)]">
                        {sub.submittedAtMs ? formatDateTime(new Date(sub.submittedAtMs).toISOString()) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ClayButton
                          variant={needsReview ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() =>
                            navigate(`/professor/tests/${testId}/submissions/${sub.id}`)
                          }
                          leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}
                        >
                          {needsReview ? 'Grade' : 'Review'}
                        </ClayButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ClayCard>
    </div>
  );
}
