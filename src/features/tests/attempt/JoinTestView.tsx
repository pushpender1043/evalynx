import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { testService } from '../../../services/testService';
import { attemptService } from '../../../services/attemptService';
import { triggerDemoWriteGuard } from '../../demo';
import { computeEffectiveTestStatus } from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { formatDateTime } from '../../../lib/utils';
import type { TestAttempt, TestItem } from '../../../types';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
} from '../../../components/ui';
import { PreTestChecklistCard } from '../../proctoring';

export function JoinTestView() {
  const { code = '' } = useParams<{ code: string }>();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [test, setTest] = useState<TestItem | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [proctoringConsent, setProctoringConsent] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!code.trim() || !user) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const found = await testService.findTestByCode(code);
        if (!active) return;
        setTest(found);
        if (found && user.role === 'student') {
          const past = await attemptService.getStudentAttemptsForTest(found.id, user.uid);
          if (!active) return;
          setAttempts(past);
        }
      } catch (err) {
        if (!active) return;
        setError(mapFirebaseError(err, 'Unable to load assessment details.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [code, user]);

  const effectiveStatus = useMemo(
    () => (test ? computeEffectiveTestStatus(test) : 'draft'),
    [test]
  );

  const activeAttempt = useMemo(
    () => attempts.find((a) => a.status === 'in_progress') ?? null,
    [attempts]
  );

  const completedAttempts = useMemo(
    () => attempts.filter((a) => a.status !== 'in_progress'),
    [attempts]
  );

  const attemptsRemaining = test
    ? Math.max(0, test.settings.attemptLimit - attempts.length)
    : 0;

  const canStartNewAttempt =
    Boolean(test) &&
    user?.role === 'student' &&
    test!.published &&
    effectiveStatus === 'live' &&
    !activeAttempt &&
    attemptsRemaining > 0 &&
    test!.questionCount > 0;

  const handleStartOrResume = async () => {
    if (!test || !user || user.role !== 'student') return;
    if (triggerDemoWriteGuard('start a live test attempt')) return;

    if (activeAttempt) {
      navigate(`/student/attempt/${activeAttempt.id}`);
      return;
    }

    if (!acknowledged) {
      pushToast({
        title: 'Confirmation required',
        description: 'Please confirm that you understand the instructions before starting.',
        tone: 'warning',
      });
      return;
    }

    if (test.proctoring.enabled && !proctoringConsent) {
      pushToast({
        title: 'Monitoring consent required',
        description: 'Please review the pre-test monitoring checklist and check the consent box.',
        tone: 'warning',
      });
      return;
    }

    setStarting(true);
    setError(null);
    try {
      if (test.proctoring.enabled && test.proctoring.fullscreenRequired) {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch {
          // Non-blocking in restricted iframes or browsers
        }
      }

      const { attempt, resumed } = await attemptService.startOrResumeAttempt({
        test,
        student: user,
      });
      pushToast({
        title: resumed ? 'Resuming attempt' : 'Assessment started',
        description: resumed ? 'Your saved answers and timer are restored.' : 'Good luck!',
        tone: 'success',
      });
      navigate(`/student/attempt/${attempt.id}`, { replace: true });
    } catch (err) {
      const msg = mapFirebaseError(err, 'Unable to start the test right now.');
      setError(msg);
      pushToast({
        title: 'Unable to start test',
        description: msg,
        tone: 'danger',
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <ClayButton
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() =>
            navigate(user?.role === 'professor' ? '/professor/tests' : '/student/dashboard')
          }
        >
          Back
        </ClayButton>
        <ClayCard>
          <EmptyState
            embedded
            icon={<HelpCircle className="h-6 w-6" aria-hidden="true" />}
            title={`Assessment "${code.toUpperCase()}" not found`}
            description={
              error ||
              'Double-check the 6-character join code shared by your professor and try again.'
            }
            actionLabel="Return to Dashboard"
            onAction={() =>
              navigate(user?.role === 'professor' ? '/professor/tests' : '/student/dashboard')
            }
          />
        </ClayCard>
      </div>
    );
  }

  const statusTone =
    effectiveStatus === 'live'
      ? 'mint'
      : effectiveStatus === 'scheduled'
        ? 'purple'
        : effectiveStatus === 'completed'
          ? 'neutral'
          : 'amber';

  const statusLabel =
    effectiveStatus === 'live'
      ? 'Live Now'
      : effectiveStatus === 'scheduled'
        ? 'Scheduled'
        : effectiveStatus === 'completed'
          ? 'Closed'
          : 'Draft';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <ClayButton
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          onClick={() =>
            navigate(user?.role === 'professor' ? '/professor/tests' : '/student/dashboard')
          }
        >
          Back
        </ClayButton>
        <ClayBadge tone={statusTone}>{statusLabel}</ClayBadge>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Assessment Overview Card */}
      <ClayCard className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ClayBadge tone="purple">{test.category}</ClayBadge>
              <span className="font-mono-tabular text-xs font-bold text-[var(--text-muted)]">
                Code: {test.code}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {test.title}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {test.subject}
              {test.professorName ? ` · Conducted by ${test.professorName}` : ''}
            </p>
          </div>
        </div>

        {test.description && (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {test.description}
          </p>
        )}

        {/* Key Specs Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Duration
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-base font-extrabold tabular-nums text-[var(--text-primary)]">
              <Clock className="h-4 w-4 text-[var(--accent-primary)]" aria-hidden="true" />
              {test.durationMinutes} min
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Questions
            </p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--text-primary)]">
              {test.questionCount}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Total Marks
            </p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--text-primary)]">
              {test.totalMarks}
              <span className="ml-1 text-xs font-semibold text-[var(--text-muted)]">
                (Pass {test.passingMarks})
              </span>
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Attempts
            </p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--text-primary)]">
              {user?.role === 'student'
                ? `${attempts.length} / ${test.settings.attemptLimit}`
                : `${test.settings.attemptLimit} max`}
            </p>
          </div>
        </div>

        {/* Schedule & Rules */}
        <div className="clay-inset space-y-2 rounded-[20px] p-4 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>
              Window: <strong className="text-[var(--text-primary)]">{formatDateTime(test.startTime)}</strong>{' '}
              to <strong className="text-[var(--text-primary)]">{formatDateTime(test.endTime)}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--semantic-mint)]" aria-hidden="true" />
            <span>
              Negative marking:{' '}
              <strong className="text-[var(--text-primary)]">
                {test.settings.negativeMarking ? 'Enabled on marked questions' : 'Disabled'}
              </strong>{' '}
              · Results:{' '}
              <strong className="text-[var(--text-primary)]">
                {test.settings.showResultMode === 'immediate'
                  ? 'Shown immediately after submission'
                  : 'Released after professor review'}
              </strong>
            </span>
          </div>
        </div>
      </ClayCard>

      {/* Professor Preview Notice */}
      {user?.role === 'professor' ? (
        <ClayCard className="space-y-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            You are viewing this join link as a Professor.
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Share this page URL or join code <strong className="font-mono-tabular">{test.code}</strong> with your students so they can start their attempt.
          </p>
          <div className="flex flex-wrap gap-3">
            {test.professorId === user.uid && (
              <>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/professor/tests/${test.id}/edit`)}
                >
                  Open in Builder
                </ClayButton>
                <ClayButton
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/professor/tests/${test.id}/submissions`)}
                >
                  View Submissions
                </ClayButton>
              </>
            )}
          </div>
        </ClayCard>
      ) : (
        <>
          {/* Resume Active Attempt */}
          {activeAttempt && (
            <ClayCard className="space-y-4 ring-2 ring-[var(--accent-primary)]/35">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <ClayBadge tone="mint">Attempt in Progress</ClayBadge>
                  <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
                    You have an active attempt running
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Your timer continues on server time and your saved answers are ready to resume.
                  </p>
                </div>
                <ClayButton
                  variant="primary"
                  leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                  onClick={handleStartOrResume}
                >
                  Resume Test
                </ClayButton>
              </div>
            </ClayCard>
          )}

          {/* Instructions & Start Flow */}
          {!activeAttempt && (
            <ClayCard className="space-y-5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Instructions & Readiness Check
                </h2>
              </div>

              <div className="clay-inset space-y-2 rounded-[20px] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {test.instructions ? (
                  <p className="whitespace-pre-wrap">{test.instructions}</p>
                ) : (
                  <ul className="list-disc space-y-1.5 pl-5 text-xs">
                    <li>The countdown timer starts immediately once you click Start Test and cannot be paused.</li>
                    <li>Your responses are automatically saved to the server as you work.</li>
                    <li>When time expires, your attempt will be submitted automatically.</li>
                    <li>Review all flagged questions before confirming final submission.</li>
                  </ul>
                )}
              </div>

              {!test.published ? (
                <div className="clay-inset rounded-[18px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-amber-text)]">
                  This assessment is still in draft mode and has not been published yet.
                </div>
              ) : effectiveStatus === 'scheduled' ? (
                <div className="clay-inset rounded-[18px] bg-[var(--accent-soft)] px-4 py-3 text-xs font-semibold text-[var(--accent-primary)]">
                  This test has not opened yet. You can start on {formatDateTime(test.startTime)}.
                </div>
              ) : effectiveStatus === 'completed' ? (
                <div className="clay-inset rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-coral-text)]">
                  The test window closed on {formatDateTime(test.endTime)}.
                </div>
              ) : attemptsRemaining === 0 ? (
                <div className="clay-inset rounded-[18px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-amber-text)]">
                  You have used all {test.settings.attemptLimit} allowed{' '}
                  {test.settings.attemptLimit === 1 ? 'attempt' : 'attempts'} for this assessment.
                </div>
              ) : test.questionCount === 0 ? (
                <div className="clay-inset rounded-[18px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-amber-text)]">
                  This assessment has no questions configured yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {test.proctoring.enabled && (
                    <PreTestChecklistCard
                      policy={test.proctoring}
                      consentChecked={proctoringConsent}
                      onConsentChange={setProctoringConsent}
                    />
                  )}

                  <label
                    htmlFor="understand-instructions-checkbox"
                    className="clay-inset flex cursor-pointer items-start gap-3 rounded-[18px] p-4"
                  >
                    <input
                      id="understand-instructions-checkbox"
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent-primary)]"
                    />
                    <span className="text-xs font-semibold leading-relaxed text-[var(--text-primary)]">
                      I understand the instructions, duration ({test.durationMinutes} min), and
                      submission rules, and I am ready to begin this timed assessment.
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <ClayButton
                      variant="primary"
                      size="lg"
                      disabled={
                        !acknowledged ||
                        (test.proctoring.enabled && !proctoringConsent) ||
                        !canStartNewAttempt
                      }
                      loading={starting}
                      leftIcon={<PlayCircle className="h-4 w-4" aria-hidden="true" />}
                      rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                      onClick={handleStartOrResume}
                    >
                      {test.proctoring.enabled ? 'Start Monitored Test' : 'Start Test'}
                    </ClayButton>
                  </div>
                </div>
              )}
            </ClayCard>
          )}

          {/* Previous Completed Attempts */}
          {completedAttempts.length > 0 && (
            <ClayCard className="space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Your Previous Submissions
              </h2>
              <div className="space-y-2.5">
                {completedAttempts.map((att) => {
                  const hidden =
                    test.settings.showResultMode === 'after_review' && att.status !== 'evaluated';
                  return (
                    <div
                      key={att.id}
                      className="clay-inset flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className="h-4 w-4 shrink-0 text-[var(--semantic-mint)]"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            Attempt #{att.attemptNumber}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Submitted{' '}
                            {att.submittedAtMs
                              ? formatDateTime(new Date(att.submittedAtMs).toISOString())
                              : 'recently'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {hidden ? (
                          <ClayBadge tone="amber">Pending Review</ClayBadge>
                        ) : (
                          <span className="text-sm font-extrabold tabular-nums text-[var(--text-primary)]">
                            {att.score}/{att.totalMarks} ({att.percentage}%)
                          </span>
                        )}
                        <ClayButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/student/results/${att.id}`)}
                        >
                          View Result
                        </ClayButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ClayCard>
          )}
        </>
      )}
    </div>
  );
}
