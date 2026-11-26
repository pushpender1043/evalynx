import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Eraser,
  Maximize2,
  Moon,
  Send,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useUIStore } from '../../../store/uiStore';
import { attemptService } from '../../../services/attemptService';
import {
  computeRemainingSeconds,
  formatTimerSeconds,
  hasAnswerContent,
} from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn } from '../../../lib/utils';
import type { AttemptAnswer, PublicQuestion, TestAttempt, TestItem } from '../../../types';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
  Logo,
  Modal,
  ProgressBar,
  ToastContainer,
} from '../../../components/ui';
import { ProctoringWarningModal, useProctoringMonitor } from '../../proctoring';

const QUESTION_TYPE_LABELS: Record<PublicQuestion['type'], string> = {
  mcq: 'Single Choice',
  multi_select: 'Multiple Correct',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
};

export function StudentAttemptView() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const pushToast = useUIStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AttemptAnswer>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const serverOffsetRef = useRef(0);
  const hydratedRef = useRef(false);
  const submittingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const latestAnswersRef = useRef<Record<string, AttemptAnswer>>({});
  const latestFlaggedRef = useRef<string[]>([]);

  useEffect(() => {
    latestAnswersRef.current = answers;
    latestFlaggedRef.current = flaggedIds;
  }, [answers, flaggedIds]);

  const clearReloadGuardRef = useRef<() => void>(() => {});

  const executeSubmit = useCallback(
    async (autoSubmitted: boolean, autoSubmitReason?: string) => {
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitModalOpen(false);
      clearReloadGuardRef.current();

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      try {
        await attemptService.submitAttempt({
          attemptId,
          answers: latestAnswersRef.current,
          flaggedQuestionIds: latestFlaggedRef.current,
          autoSubmitted,
          autoSubmitReason,
        });
        pushToast({
          title: autoSubmitReason
            ? 'Assessment auto-submitted'
            : autoSubmitted
              ? 'Time is up'
              : 'Assessment submitted',
          description:
            autoSubmitReason ||
            (autoSubmitted
              ? 'Your assessment was submitted automatically.'
              : 'Your responses have been recorded.'),
          tone: autoSubmitReason ? 'warning' : 'success',
        });
        navigate(`/student/results/${attemptId}`, { replace: true });
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        pushToast({
          title: 'Submission failed',
          description: mapFirebaseError(err, 'Unable to submit your attempt. Please try again.'),
          tone: 'danger',
        });
      }
    },
    [attemptId, pushToast, navigate]
  );

  const defaultProctoringPolicy = useMemo(
    () =>
      test?.proctoring ?? {
        enabled: false,
        fullscreenRequired: false,
        maxTabSwitches: 3,
        blockCopyPaste: false,
        webcamEnabled: false,
        autoSubmitOnLimit: true,
      },
    [test]
  );

  const proctoring = useProctoringMonitor({
    enabled: Boolean(test?.proctoring.enabled && attempt?.status === 'in_progress'),
    policy: defaultProctoringPolicy,
    attempt,
    currentQuestionNumber: currentIndex + 1,
    isSubmitting: submitting,
    onAutoSubmitLimit: (reason) => {
      void executeSubmit(true, reason);
    },
  });

  useEffect(() => {
    clearReloadGuardRef.current = proctoring.clearReloadGuard;
  }, [proctoring.clearReloadGuard]);

  // Initial session hydration from Firestore server time
  useEffect(() => {
    if (!attemptId || !user) return;
    let active = true;
    hydratedRef.current = false;
    setLoading(true);
    setLoadError(null);

    void attemptService
      .loadAttemptSession(attemptId)
      .then((session) => {
        if (!active) return;

        if (session.attempt.studentId !== user.uid) {
          setLoadError('You do not have permission to access this assessment attempt.');
          setLoading(false);
          return;
        }

        if (session.attempt.status !== 'in_progress') {
          navigate(`/student/results/${attemptId}`, { replace: true });
          return;
        }

        serverOffsetRef.current = session.serverOffsetMs;
        setAttempt(session.attempt);
        setTest(session.test);
        setQuestions(session.questions);
        setAnswers(session.attempt.answers ?? {});
        setFlaggedIds(session.attempt.flaggedQuestionIds ?? []);
        latestAnswersRef.current = session.attempt.answers ?? {};
        latestFlaggedRef.current = session.attempt.flaggedQuestionIds ?? [];

        const initialRemaining = computeRemainingSeconds(
          session.attempt.startedAtMs,
          session.attempt.durationMinutes,
          Date.now() + session.serverOffsetMs
        );
        setRemainingSeconds(initialRemaining);
        setLoading(false);

        window.setTimeout(() => {
          hydratedRef.current = true;
        }, 0);

        if (initialRemaining <= 0) {
          void executeSubmit(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(mapFirebaseError(err, 'Unable to load your assessment session.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId, user, navigate, executeSubmit]);

  // Countdown tick anchored to server offset
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;

    const tick = () => {
      const rem = computeRemainingSeconds(
        attempt.startedAtMs,
        attempt.durationMinutes,
        Date.now() + serverOffsetRef.current
      );
      setRemainingSeconds(rem);
      if (rem <= 0 && !submittingRef.current) {
        void executeSubmit(true);
      }
    };

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [attempt, executeSubmit]);

  // Debounced auto-save to Firestore whenever answers or review flags change
  useEffect(() => {
    if (!hydratedRef.current || !attemptId || submittingRef.current) return;

    setSaveState('saving');
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      if (submittingRef.current) return;
      void attemptService
        .saveAttemptProgress(attemptId, {
          answers: latestAnswersRef.current,
          flaggedQuestionIds: latestFlaggedRef.current,
        })
        .then(() => {
          setSaveState('saved');
        })
        .catch(() => {
          setSaveState('error');
        });
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [answers, flaggedIds, attemptId]);

  const currentQuestion = questions[currentIndex] ?? null;

  const summary = useMemo(() => {
    let answered = 0;
    questions.forEach((q) => {
      if (hasAnswerContent(q.type, answers[q.id])) answered += 1;
    });
    const unanswered = Math.max(0, questions.length - answered);
    return {
      total: questions.length,
      answered,
      unanswered,
      flagged: flaggedIds.length,
      progressPct: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0,
    };
  }, [questions, answers, flaggedIds]);

  const updateAnswer = (questionId: string, nextAnswer: AttemptAnswer | null) => {
    setAnswers((prev) => {
      if (!nextAnswer) {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      }
      return { ...prev, [questionId]: nextAnswer };
    });
  };

  const handleSelectSingle = (questionId: string, optionId: string) => {
    updateAnswer(questionId, {
      selectedOptionIds: [optionId],
      updatedAtMs: Date.now(),
    });
  };

  const handleToggleMulti = (questionId: string, optionId: string) => {
    const existing = answers[questionId]?.selectedOptionIds ?? [];
    const next = existing.includes(optionId)
      ? existing.filter((id) => id !== optionId)
      : [...existing, optionId];
    if (next.length === 0) {
      updateAnswer(questionId, null);
    } else {
      updateAnswer(questionId, {
        selectedOptionIds: next,
        updatedAtMs: Date.now(),
      });
    }
  };

  const handleTextChange = (questionId: string, value: string) => {
    if (!value) {
      updateAnswer(questionId, null);
    } else {
      updateAnswer(questionId, {
        textAnswer: value,
        updatedAtMs: Date.now(),
      });
    }
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const handleClearCurrent = () => {
    if (!currentQuestion) return;
    updateAnswer(currentQuestion.id, null);
  };

  if (loading) {
    return (
      <>
        <Loader fullscreen size="lg" />
        <ToastContainer />
      </>
    );
  }

  if (loadError || !attempt || !test || questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-6">
        <ClayCard className="w-full max-w-lg">
          <EmptyState
            embedded
            icon={<AlertCircle className="h-6 w-6" aria-hidden="true" />}
            title="Unable to open assessment"
            description={loadError || 'This attempt could not be loaded.'}
            actionLabel="Back to Dashboard"
            onAction={() => navigate('/student/dashboard')}
          />
        </ClayCard>
        <ToastContainer />
      </div>
    );
  }

  const isCriticalTime = remainingSeconds !== null && remainingSeconds <= 60;
  const isWarningTime =
    remainingSeconds !== null && remainingSeconds > 60 && remainingSeconds <= 300;
  const isCurrentFlagged = currentQuestion ? flaggedIds.includes(currentQuestion.id) : false;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] transition-colors duration-200">
      {/* Distraction-Free Top Bar */}
      <header className="sticky top-0 z-30 bg-[var(--bg-canvas)]/90 px-4 py-3 backdrop-blur-md">
        <div className="clay-card mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="icon" size="sm" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold text-[var(--text-primary)] sm:text-base">
                {test.title}
              </h1>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {test.subject} · Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Proctoring Monitored Status Badge */}
            {test.proctoring.enabled && (
              <ClayBadge
                tone={
                  proctoring.violationCount >= proctoring.maxStrikes - 1 &&
                  proctoring.violationCount > 0
                    ? 'coral'
                    : proctoring.violationCount > 0
                      ? 'amber'
                      : 'purple'
                }
                className="tabular-nums"
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                <span data-testid="monitored-warning-counter">
                  Monitored · {proctoring.violationCount}/{proctoring.maxStrikes} warnings
                </span>
              </ClayBadge>
            )}

            {/* Auto-Save Status */}
            <div
              className="hidden items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] md:flex"
              aria-live="polite"
            >
              {saveState === 'saving' ? (
                <>
                  <Cloud className="h-3.5 w-3.5 animate-pulse text-[var(--accent-primary)]" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : saveState === 'error' ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-[var(--semantic-coral)]" aria-hidden="true" />
                  <span className="text-[var(--semantic-coral-text)]">Save retry</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--semantic-mint)]" aria-hidden="true" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {/* Countdown Timer */}
            <div
              data-testid="attempt-timer"
              aria-label="Remaining time"
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold font-mono-tabular transition-colors',
                isCriticalTime
                  ? 'animate-pulse bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]'
                  : isWarningTime
                    ? 'bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)] shadow-[var(--shadow-clay-sm)]'
                    : 'clay-inset text-[var(--text-primary)]'
              )}
            >
              <Clock
                className={cn(
                  'h-4 w-4',
                  isCriticalTime
                    ? 'text-[var(--semantic-coral)]'
                    : isWarningTime
                      ? 'text-[var(--semantic-amber)]'
                      : 'text-[var(--accent-primary)]'
                )}
                aria-hidden="true"
              />
              <span>
                {remainingSeconds !== null ? formatTimerSeconds(remainingSeconds) : '--:--'}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="clay-surface-sm flex h-10 w-10 cursor-pointer items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <ClayButton
              variant="primary"
              size="sm"
              loading={submitting}
              leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => setSubmitModalOpen(true)}
            >
              Submit Test
            </ClayButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto grid max-w-[1360px] grid-cols-1 gap-6 px-4 pb-10 pt-4 lg:grid-cols-12">
        {/* Active Question Card */}
        <section className="min-w-0 space-y-5 lg:col-span-8" aria-label="Active question">
          {test.proctoring.enabled &&
            test.proctoring.fullscreenRequired &&
            !proctoring.isFullscreen && (
              <div className="clay-inset flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs text-[var(--semantic-amber-text)]">
                <span className="font-semibold">
                  Fullscreen mode is required for this monitored session.
                </span>
                <ClayButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => void proctoring.requestFullscreen()}
                >
                  Enter Fullscreen
                </ClayButton>
              </div>
            )}

          {currentQuestion && (
            <ClayCard
              className={cn(
                'space-y-6',
                test.proctoring.enabled && test.proctoring.blockCopyPaste && 'select-none'
              )}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ClayBadge tone="purple">Question {currentIndex + 1}</ClayBadge>
                  <ClayBadge tone="neutral">{QUESTION_TYPE_LABELS[currentQuestion.type]}</ClayBadge>
                  {currentQuestion.topic && (
                    <ClayBadge tone="neutral">{currentQuestion.topic}</ClayBadge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ClayBadge tone="mint" className="tabular-nums">
                    +{currentQuestion.marks}{' '}
                    {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                  </ClayBadge>
                  {test.settings.negativeMarking && currentQuestion.negativeMarks > 0 && (
                    <ClayBadge tone="coral" className="tabular-nums">
                      -{currentQuestion.negativeMarks} wrong
                    </ClayBadge>
                  )}
                </div>
              </div>

              {/* Question Prompt & Optional Image */}
              <div className="space-y-4">
                <p className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-[var(--text-primary)] sm:text-lg">
                  {currentQuestion.prompt}
                </p>

                {currentQuestion.imageUrl && (
                  <div className="clay-inset overflow-hidden rounded-[20px] p-3">
                    <img
                      src={currentQuestion.imageUrl}
                      alt={`Visual for Question ${currentIndex + 1}`}
                      className="max-h-80 w-auto rounded-[14px] object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Answer Input */}
              <div className="space-y-3">
                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') && (
                  <div role="radiogroup" aria-label="Answer options" className="space-y-3">
                    {currentQuestion.options.map((opt, idx) => {
                      const selected =
                        currentAnswer?.selectedOptionIds?.includes(opt.id) ?? false;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => handleSelectSingle(currentQuestion.id, opt.id)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-3.5 rounded-[20px] px-4 py-3.5 text-left transition-all duration-150',
                            selected
                              ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/50'
                              : 'clay-surface-sm hover:-translate-y-0.5'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
                              selected
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'clay-inset text-[var(--text-secondary)]'
                            )}
                          >
                            {letter}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'multi_select' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      Select all options that apply.
                    </p>
                    <div role="group" aria-label="Multiple choice options" className="space-y-3">
                      {currentQuestion.options.map((opt, idx) => {
                        const checked =
                          currentAnswer?.selectedOptionIds?.includes(opt.id) ?? false;
                        const letter = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() => handleToggleMulti(currentQuestion.id, opt.id)}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-3.5 rounded-[20px] px-4 py-3.5 text-left transition-all duration-150',
                              checked
                                ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/50'
                                : 'clay-surface-sm hover:-translate-y-0.5'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-extrabold',
                                checked
                                  ? 'bg-[var(--accent-primary)] text-white'
                                  : 'clay-inset text-[var(--text-secondary)]'
                              )}
                            >
                              {checked ? '✓' : letter}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(currentQuestion.type === 'short_answer' ||
                  currentQuestion.type === 'long_answer') && (
                  <div className="space-y-2">
                    <label
                      htmlFor={`answer-textarea-${currentQuestion.id}`}
                      className="block text-xs font-semibold text-[var(--text-secondary)]"
                    >
                      Your Response
                    </label>
                    <textarea
                      id={`answer-textarea-${currentQuestion.id}`}
                      rows={currentQuestion.type === 'long_answer' ? 9 : 4}
                      value={currentAnswer?.textAnswer ?? ''}
                      onChange={(e) => handleTextChange(currentQuestion.id, e.target.value)}
                      placeholder={
                        currentQuestion.type === 'long_answer'
                          ? 'Write your detailed response here...'
                          : 'Type your concise answer here...'
                      }
                      className="clay-inset w-full rounded-[20px] p-4 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
                    />
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] tabular-nums">
                      <span>Evaluated by your professor after submission</span>
                      <span>{(currentAnswer?.textAnswer ?? '').length} chars</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation & Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ClayButton
                    variant="secondary"
                    size="sm"
                    disabled={currentIndex === 0}
                    leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </ClayButton>

                  <ClayButton
                    variant="secondary"
                    size="sm"
                    leftIcon={<Bookmark className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => handleToggleFlag(currentQuestion.id)}
                    className={cn(
                      isCurrentFlagged &&
                        'bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)] ring-2 ring-[var(--semantic-amber)]/40'
                    )}
                  >
                    {isCurrentFlagged ? 'Marked for Review' : 'Mark for Review'}
                  </ClayButton>

                  <ClayButton
                    variant="ghost"
                    size="sm"
                    disabled={!hasAnswerContent(currentQuestion.type, currentAnswer)}
                    leftIcon={<Eraser className="h-4 w-4" aria-hidden="true" />}
                    onClick={handleClearCurrent}
                  >
                    Clear Answer
                  </ClayButton>
                </div>

                {currentIndex < questions.length - 1 ? (
                  <ClayButton
                    variant="primary"
                    size="sm"
                    rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                    }
                  >
                    Next Question
                  </ClayButton>
                ) : (
                  <ClayButton
                    variant="primary"
                    size="sm"
                    leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setSubmitModalOpen(true)}
                  >
                    Review & Submit
                  </ClayButton>
                )}
              </div>
            </ClayCard>
          )}
        </section>

        {/* Right Column: Question Palette */}
        <aside className="min-w-0 space-y-5 lg:col-span-4" aria-label="Question palette">
          <ClayCard className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Question Palette
                </h2>
                <span className="text-xs font-bold tabular-nums text-[var(--accent-primary)]">
                  {summary.answered}/{summary.total} Answered
                </span>
              </div>
              <div className="mt-2.5">
                <ProgressBar
                  value={summary.progressPct}
                  accent="purple"
                  label="Assessment completion progress"
                />
              </div>
            </div>

            {/* Numbered Grid */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = hasAnswerContent(q.type, answers[q.id]);
                const isFlagged = flaggedIds.includes(q.id);
                const stateLabel = isCurrent
                  ? 'Current'
                  : isFlagged
                    ? 'Marked for review'
                    : isAnswered
                      ? 'Answered'
                      : 'Unanswered';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Question ${idx + 1} — ${stateLabel}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'relative flex h-11 cursor-pointer items-center justify-center rounded-[14px] text-xs font-extrabold tabular-nums transition-all duration-150',
                      isCurrent
                        ? 'bg-[var(--accent-primary)] text-white shadow-[var(--shadow-clay-sm)] ring-2 ring-[var(--accent-primary)]/40'
                        : isFlagged
                          ? 'bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)] shadow-[var(--shadow-clay-sm)]'
                          : isAnswered
                            ? 'bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)] shadow-[var(--shadow-clay-sm)]'
                            : 'clay-inset text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {idx + 1}
                    {isFlagged && isAnswered && !isCurrent && (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--semantic-mint)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Color + Text Legend */}
            <div className="clay-inset grid grid-cols-2 gap-2.5 rounded-[18px] p-3.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
                <span className="text-[var(--text-secondary)]">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[var(--semantic-mint)]" aria-hidden="true" />
                <span className="text-[var(--text-secondary)] tabular-nums">
                  Answered ({summary.answered})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[var(--semantic-amber)]" aria-hidden="true" />
                <span className="text-[var(--text-secondary)] tabular-nums">
                  Marked ({summary.flagged})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="clay-inset h-3 w-3 rounded-full bg-[var(--bg-surface-muted)]"
                  aria-hidden="true"
                />
                <span className="text-[var(--text-secondary)] tabular-nums">
                  Unanswered ({summary.unanswered})
                </span>
              </div>
            </div>

            <ClayButton
              variant="primary"
              className="w-full"
              loading={submitting}
              leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setSubmitModalOpen(true)}
            >
              Submit Assessment
            </ClayButton>
          </ClayCard>
        </aside>
      </main>

      {/* Submit Confirmation Modal */}
      <Modal
        open={submitModalOpen}
        onClose={() => {
          if (!submitting) setSubmitModalOpen(false);
        }}
        title="Submit Assessment?"
        description="Once submitted, your answers are locked and cannot be edited."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <div className="clay-inset rounded-[16px] p-3">
              <p className="text-[11px] text-[var(--text-muted)]">Total</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--text-primary)]">
                {summary.total}
              </p>
            </div>
            <div className="clay-inset rounded-[16px] p-3">
              <p className="text-[11px] text-[var(--text-muted)]">Answered</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--semantic-mint-text)]">
                {summary.answered}
              </p>
            </div>
            <div className="clay-inset rounded-[16px] p-3">
              <p className="text-[11px] text-[var(--text-muted)]">Unanswered</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--semantic-coral-text)]">
                {summary.unanswered}
              </p>
            </div>
            <div className="clay-inset rounded-[16px] p-3">
              <p className="text-[11px] text-[var(--text-muted)]">Marked</p>
              <p className="mt-1 text-base font-extrabold tabular-nums text-[var(--semantic-amber-text)]">
                {summary.flagged}
              </p>
            </div>
          </div>

          {(summary.unanswered > 0 || summary.flagged > 0) && (
            <div className="clay-inset rounded-[16px] bg-[var(--semantic-amber-soft)] px-4 py-3 text-xs font-semibold text-[var(--semantic-amber-text)]">
              You still have{' '}
              {summary.unanswered > 0 ? `${summary.unanswered} unanswered` : ''}
              {summary.unanswered > 0 && summary.flagged > 0 ? ' and ' : ''}
              {summary.flagged > 0 ? `${summary.flagged} marked for review` : ''}. Time left:{' '}
              {remainingSeconds !== null ? formatTimerSeconds(remainingSeconds) : '--:--'}.
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <ClayButton
              variant="secondary"
              size="sm"
              disabled={submitting}
              onClick={() => setSubmitModalOpen(false)}
            >
              Continue Test
            </ClayButton>
            <ClayButton
              variant="primary"
              size="sm"
              loading={submitting}
              leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => void executeSubmit(false)}
            >
              Confirm & Submit
            </ClayButton>
          </div>
        </div>
      </Modal>

      <ProctoringWarningModal
        warning={proctoring.activeWarning}
        autoSubmitOnLimit={test.proctoring.autoSubmitOnLimit}
        fullscreenRequired={test.proctoring.fullscreenRequired}
        isFullscreen={proctoring.isFullscreen}
        onContinue={proctoring.dismissWarning}
        onReenterFullscreen={proctoring.requestFullscreen}
      />

      <ToastContainer />
    </div>
  );
}
