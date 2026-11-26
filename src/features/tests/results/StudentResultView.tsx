import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Hourglass,
  MessageSquare,
  MinusCircle,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { attemptService } from '../../../services/attemptService';
import { testService } from '../../../services/testService';
import { formatTimerSeconds, isObjectiveQuestionType } from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn, formatDateTime } from '../../../lib/utils';
import type {
  PublicQuestion,
  QuestionAnswerKeyEntry,
  TestAttempt,
  TestItem,
} from '../../../types';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
  ProgressRing,
} from '../../../components/ui';

export function StudentResultView() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answerKey, setAnswerKey] = useState<Record<string, QuestionAnswerKeyEntry> | null>(null);
  const [rankInfo, setRankInfo] = useState<{ rank: number; totalStudents: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId || !user) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRankInfo(null);

    void attemptService
      .loadResultDetail(attemptId, 'student')
      .then(async (data) => {
        if (!active) return;
        if (data.attempt.studentId !== user.uid) {
          setError('You do not have permission to view this submission.');
          setLoading(false);
          return;
        }
        if (data.attempt.status === 'in_progress') {
          navigate(`/student/attempt/${attemptId}`, { replace: true });
          return;
        }
        setAttempt(data.attempt);
        setTest(data.test);
        setQuestions(data.questions);
        setAnswerKey(data.answerKey);

        if (data.test.settings.showRankToStudents) {
          const rank = await testService.getStudentRankForTest(
            data.test.id,
            user.uid,
            true
          );
          if (active && rank.rank > 0) {
            setRankInfo(rank);
          }
        }
        if (active) setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(mapFirebaseError(err, 'Unable to load your result right now.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  if (error || !attempt || !test) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <ClayButton
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </ClayButton>
        <ClayCard>
          <EmptyState
            embedded
            icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />}
            title="Result unavailable"
            description={error || 'We could not find this assessment result.'}
            actionLabel="Go to Dashboard"
            onAction={() => navigate('/student/dashboard')}
          />
        </ClayCard>
      </div>
    );
  }

  const hideDetailedResult =
    test.settings.showResultMode === 'after_review' && attempt.status !== 'evaluated';

  if (hideDetailedResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <ClayButton
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </ClayButton>

        <ClayCard className="space-y-5 text-center">
          <div className="clay-surface-sm mx-auto flex h-14 w-14 items-center justify-center text-[var(--semantic-mint)]">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <ClayBadge tone="amber">Pending Professor Review</ClayBadge>
            <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)]">
              Submission Received
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {test.title} · {test.subject}
            </p>
          </div>

          {attempt.autoSubmitReason && (
            <div
              data-testid="auto-submit-reason-banner"
              className="clay-inset mx-auto flex max-w-md items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-left text-xs text-[var(--semantic-coral-text)]"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{attempt.autoSubmitReason}</span>
            </div>
          )}

          <p className="mx-auto max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
            Your professor has configured results for this assessment to be released after review.
            Your detailed score breakdown and answer explanations will appear here once grading is
            finalized.
          </p>

          <div className="mx-auto grid max-w-md grid-cols-2 gap-3 text-left">
            <div className="clay-inset rounded-[18px] p-3.5">
              <p className="text-[11px] text-[var(--text-muted)]">Submitted</p>
              <p className="mt-1 text-xs font-bold text-[var(--text-primary)]">
                {attempt.submittedAtMs
                  ? formatDateTime(new Date(attempt.submittedAtMs).toISOString())
                  : 'Just now'}
              </p>
            </div>
            <div className="clay-inset rounded-[18px] p-3.5">
              <p className="text-[11px] text-[var(--text-muted)]">Time Taken</p>
              <p className="mt-1 text-xs font-bold font-mono-tabular text-[var(--text-primary)]">
                {attempt.timeTakenSeconds !== undefined
                  ? formatTimerSeconds(attempt.timeTakenSeconds)
                  : '--:--'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <ClayButton variant="primary" onClick={() => navigate('/student/dashboard')}>
              Return to Dashboard
            </ClayButton>
          </div>
        </ClayCard>
      </div>
    );
  }

  const hasPending = attempt.pendingReviewCount > 0;
  const ringAccent = hasPending
    ? 'amber'
    : attempt.passed
      ? 'mint'
      : 'coral';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ClayButton
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </ClayButton>

        <div className="flex flex-wrap items-center gap-2">
          {attempt.status === 'auto_submitted' && (
            <ClayBadge tone={attempt.autoSubmitReason ? 'coral' : 'amber'}>
              {attempt.autoSubmitReason
                ? 'Auto-Submitted (Monitoring Limit)'
                : 'Auto-Submitted on Timer'}
            </ClayBadge>
          )}
          {test.settings.showRankToStudents && rankInfo && rankInfo.rank > 0 && (
            <ClayBadge tone="purple" className="tabular-nums">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              <span data-testid="student-result-rank">
                Rank #{rankInfo.rank} of {rankInfo.totalStudents}
              </span>
            </ClayBadge>
          )}
          <ClayBadge tone={hasPending ? 'amber' : attempt.passed ? 'mint' : 'coral'}>
            {hasPending ? 'Pending Manual Review' : attempt.passed ? 'Passed' : 'Did Not Pass'}
          </ClayBadge>
        </div>
      </div>

      {attempt.autoSubmitReason && (
        <div
          data-testid="auto-submit-reason-banner"
          className="clay-inset flex items-start gap-3 rounded-[20px] bg-[var(--semantic-coral-soft)] px-5 py-4 text-xs text-[var(--semantic-coral-text)]"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold">Assessment Auto-Submitted</p>
            <p className="mt-0.5 leading-relaxed text-[var(--text-primary)]">
              {attempt.autoSubmitReason}
            </p>
          </div>
        </div>
      )}

      {/* Score Summary Card */}
      <ClayCard className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              {test.subject} · Attempt #{attempt.attemptNumber}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {test.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                Time taken:{' '}
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  {attempt.timeTakenSeconds !== undefined
                    ? formatTimerSeconds(attempt.timeTakenSeconds)
                    : '--:--'}
                </strong>
              </span>
              <span>
                Submitted:{' '}
                <strong className="text-[var(--text-primary)]">
                  {attempt.submittedAtMs
                    ? formatDateTime(new Date(attempt.submittedAtMs).toISOString())
                    : 'Recently'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs font-semibold text-[var(--text-muted)]">Score</p>
              <p className="text-3xl font-extrabold tabular-nums text-[var(--text-primary)]">
                {attempt.score}
                <span className="text-base font-bold text-[var(--text-muted)]">
                  /{attempt.totalMarks}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
                Passing: {test.passingMarks} marks
              </p>
            </div>
            <ProgressRing
              value={attempt.percentage}
              size={92}
              strokeWidth={9}
              accent={ringAccent}
              label="Percentage score"
            />
          </div>
        </div>

        {hasPending && (
          <div className="clay-inset flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-amber-text)]">
            <Hourglass className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {attempt.pendingReviewCount}{' '}
              {attempt.pendingReviewCount === 1 ? 'subjective question is' : 'subjective questions are'}{' '}
              awaiting manual evaluation by your professor. Your final score will update once graded.
            </span>
          </div>
        )}

        {/* Outcome Count Tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Correct</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold tabular-nums text-[var(--semantic-mint-text)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {attempt.correctCount}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Wrong</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold tabular-nums text-[var(--semantic-coral-text)]">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              {attempt.wrongCount}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Skipped</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold tabular-nums text-[var(--text-secondary)]">
              <MinusCircle className="h-4 w-4" aria-hidden="true" />
              {attempt.skippedCount}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-muted)]">Pending Review</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-extrabold tabular-nums text-[var(--semantic-amber-text)]">
              <Hourglass className="h-4 w-4" aria-hidden="true" />
              {attempt.pendingReviewCount}
            </p>
          </div>
        </div>
      </ClayCard>

      {/* Per-Question Breakdown */}
      <section className="space-y-4" aria-label="Question breakdown">
        <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
          Question-by-Question Review
        </h2>

        {questions.map((q, idx) => {
          const grade = attempt.questionGrades[q.id];
          const studentAns = attempt.answers[q.id];
          const keyEntry = answerKey?.[q.id];
          const outcome = grade?.outcome ?? 'skipped';

          const outcomeTone =
            outcome === 'correct'
              ? 'mint'
              : outcome === 'wrong'
                ? 'coral'
                : outcome === 'pending_review'
                  ? 'amber'
                  : 'neutral';

          const outcomeLabel =
            outcome === 'correct'
              ? 'Correct'
              : outcome === 'wrong'
                ? 'Incorrect'
                : outcome === 'pending_review'
                  ? 'Pending Review'
                  : 'Skipped';

          const marksText =
            outcome === 'pending_review'
              ? `Pending / ${q.marks}`
              : `${(grade?.marksAwarded ?? 0) > 0 ? '+' : ''}${grade?.marksAwarded ?? 0} / ${q.marks}`;

          return (
            <ClayCard key={q.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ClayBadge tone="purple">Q{idx + 1}</ClayBadge>
                  <ClayBadge tone={outcomeTone}>{outcomeLabel}</ClayBadge>
                  {q.topic && <ClayBadge tone="neutral">{q.topic}</ClayBadge>}
                </div>
                <span className="text-xs font-extrabold tabular-nums text-[var(--text-primary)]">
                  {marksText} marks
                </span>
              </div>

              <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[var(--text-primary)]">
                {q.prompt}
              </p>

              {q.imageUrl && (
                <div className="clay-inset overflow-hidden rounded-[18px] p-2.5">
                  <img
                    src={q.imageUrl}
                    alt={`Question ${idx + 1} visual`}
                    className="max-h-64 w-auto rounded-[12px] object-contain"
                  />
                </div>
              )}

              {/* Objective Answer Display */}
              {isObjectiveQuestionType(q.type) ? (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const chosen = studentAns?.selectedOptionIds?.includes(opt.id) ?? false;
                    const isCorrectOpt = keyEntry?.correctAnswers?.includes(opt.id) ?? false;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={opt.id}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-sm',
                          isCorrectOpt
                            ? 'bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)]'
                            : chosen && !isCorrectOpt
                              ? 'bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)]'
                              : 'clay-inset text-[var(--text-secondary)]'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-tabular text-xs font-extrabold">
                            {letter}.
                          </span>
                          <span className="font-medium">{opt.text}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
                          {chosen && <span>Your choice</span>}
                          {isCorrectOpt && (
                            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          )}
                          {chosen && !isCorrectOpt && (
                            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="clay-inset space-y-1.5 rounded-[18px] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Your Response
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                    {studentAns?.textAnswer?.trim() || 'No answer submitted.'}
                  </p>
                </div>
              )}

              {/* Explanation */}
              {keyEntry?.explanation && (
                <div className="clay-inset flex items-start gap-2.5 rounded-[18px] bg-[var(--accent-soft)]/50 p-3.5 text-xs text-[var(--text-secondary)]">
                  <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Explanation</p>
                    <p className="mt-0.5 leading-relaxed">{keyEntry.explanation}</p>
                  </div>
                </div>
              )}

              {/* Professor Feedback */}
              {grade?.feedback && (
                <div className="clay-inset flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-mint-soft)]/60 p-3.5 text-xs text-[var(--text-primary)]">
                  <MessageSquare
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-mint-text)]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold text-[var(--semantic-mint-text)]">Professor Feedback</p>
                    <p className="mt-0.5 leading-relaxed">{grade.feedback}</p>
                  </div>
                </div>
              )}
            </ClayCard>
          );
        })}
      </section>
    </div>
  );
}
