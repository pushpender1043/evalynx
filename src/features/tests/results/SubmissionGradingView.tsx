import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Save,
  XCircle,
} from 'lucide-react';
import type {
  AttemptViolation,
  PublicQuestion,
  QuestionAnswerKeyEntry,
  TestAttempt,
  TestItem,
} from '../../../types';
import { isObjectiveQuestionType } from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { attemptService } from '../../../services/attemptService';
import { isDemoModeActive, triggerDemoWriteGuard } from '../../demo';
import { ViolationTimelineCard } from '../../proctoring';
import { useUIStore } from '../../../store/uiStore';
import { ClayBadge, ClayButton, ClayCard, ClayInput, Loader } from '../../../components/ui';

export function SubmissionGradingView() {
  const { id: testId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const navigate = useNavigate();
  const pushToast = useUIStore((s) => s.pushToast);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answerKey, setAnswerKey] = useState<Record<string, QuestionAnswerKeyEntry>>({});
  const [violations, setViolations] = useState<AttemptViolation[]>([]);

  // Manual grades map: questionId -> { marksAwarded, feedback }
  const [manualEdits, setManualEdits] = useState<
    Record<string, { marksAwarded: string; feedback: string }>
  >({});

  useEffect(() => {
    if (!attemptId) return;
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      attemptService.loadResultDetail(attemptId, 'professor'),
      attemptService.listAttemptViolations(attemptId),
    ])
      .then(([res, loggedViolations]) => {
        if (!active) return;
        setAttempt(res.attempt);
        setTest(res.test);
        setQuestions(res.questions);
        setAnswerKey(res.answerKey ?? {});
        setViolations(loggedViolations);

        const initialEdits: Record<string, { marksAwarded: string; feedback: string }> = {};
        res.questions.forEach((q) => {
          const existingGrade = res.attempt.questionGrades[q.id];
          if (!isObjectiveQuestionType(q.type) || existingGrade?.evaluatedBy === 'professor') {
            initialEdits[q.id] = {
              marksAwarded:
                existingGrade && existingGrade.evaluatedBy !== 'pending'
                  ? String(existingGrade.marksAwarded)
                  : '',
              feedback: existingGrade?.feedback || '',
            };
          }
        });
        setManualEdits(initialEdits);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(mapFirebaseError(err, 'Unable to load submission for grading.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attemptId]);

  const handleSaveIntegrityReview = async (payload: {
    flagged: boolean;
    cleared: boolean;
    note: string;
  }) => {
    if (triggerDemoWriteGuard('update integrity flag')) return;
    if (!attemptId || !attempt) return;
    try {
      await attemptService.updateProfessorIntegrityReview(attemptId, payload);
      setAttempt((prev) =>
        prev
          ? {
              ...prev,
              professorFlagged: payload.flagged,
              professorFlagCleared: payload.cleared,
              professorFlagNote: payload.note.trim(),
              professorReviewedAtMs: Date.now(),
            }
          : prev
      );
      pushToast({
        title: payload.flagged ? 'Submission flagged' : 'Integrity flag cleared',
        description: payload.note.trim()
          ? 'Your review decision and note were saved.'
          : 'Integrity status updated on this submission.',
        tone: payload.flagged ? 'warning' : 'success',
      });
    } catch (err) {
      setError(mapFirebaseError(err, 'Unable to save integrity decision.'));
    }
  };

  const handleSaveGrades = async () => {
    if (triggerDemoWriteGuard('save and publish grades')) return;
    if (!attempt || !test || !attemptId) return;
    setSaving(true);
    setError(null);

    const parsedManual: Record<string, { marksAwarded: number; feedback?: string }> = {};
    Object.entries(manualEdits).forEach(([qId, entry]) => {
      if (entry.marksAwarded.trim() !== '' && Number.isFinite(Number(entry.marksAwarded))) {
        parsedManual[qId] = {
          marksAwarded: Number(entry.marksAwarded),
          feedback: entry.feedback,
        };
      }
    });

    try {
      const updated = await attemptService.saveProfessorManualGrades({
        attemptId,
        test,
        questions,
        answerKey,
        attempt,
        manualGrades: parsedManual,
      });
      setAttempt(updated);
      pushToast({
        title: 'Grades saved & published',
        description: `${updated.studentName} scored ${updated.score}/${updated.totalMarks} (${updated.percentage}%).`,
        tone: 'success',
      });
    } catch (err) {
      setError(mapFirebaseError(err, 'Could not save grades. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  if (!attempt || !test) {
    return (
      <ClayCard className="space-y-4 py-10 text-center">
        <p className="text-sm font-bold text-[var(--semantic-coral-text)]">
          {error || 'Submission not found.'}
        </p>
        <ClayButton
          variant="secondary"
          onClick={() => navigate(`/professor/tests/${testId}/submissions`)}
        >
          Back to Submissions
        </ClayButton>
      </ClayCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClayButton
            variant="icon"
            size="sm"
            onClick={() => navigate(`/professor/tests/${test.id}/submissions`)}
            aria-label="Back to submissions"
          >
            <ArrowLeft className="h-4 w-4" />
          </ClayButton>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {attempt.studentName}
              </h1>
              <ClayBadge tone={attempt.status === 'evaluated' ? 'mint' : 'amber'}>
                {attempt.status === 'evaluated'
                  ? 'Evaluated'
                  : `Pending review (${attempt.pendingReviewCount})`}
              </ClayBadge>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {test.title} · {attempt.studentEmail}
            </p>
          </div>
        </div>

        <ClayButton
          variant="primary"
          loading={saving}
          onClick={() => void handleSaveGrades()}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save & Publish Grade
        </ClayButton>
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

      {/* Score Summary Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ClayCard padding="sm">
          <p className="text-xs text-[var(--text-muted)]">Current Score</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {attempt.score} / {attempt.totalMarks}
          </p>
        </ClayCard>
        <ClayCard padding="sm">
          <p className="text-xs text-[var(--text-muted)]">Percentage</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--accent-primary)] tabular-nums">
            {attempt.percentage}%
          </p>
        </ClayCard>
        <ClayCard padding="sm">
          <p className="text-xs text-[var(--text-muted)]">Auto-Graded</p>
          <p className="mt-1 text-sm font-bold text-[var(--text-primary)] tabular-nums">
            {attempt.correctCount} correct · {attempt.wrongCount} wrong · {attempt.skippedCount}{' '}
            skipped
          </p>
        </ClayCard>
        <ClayCard padding="sm">
          <p className="text-xs text-[var(--text-muted)]">Pending Review</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--semantic-amber-text)] tabular-nums">
            {attempt.pendingReviewCount}
          </p>
        </ClayCard>
      </div>

      {/* Proctoring Integrity & Violation Timeline */}
      <ViolationTimelineCard
        attempt={attempt}
        violations={violations}
        isReadOnlyDemo={isDemoModeActive()}
        onSaveReview={handleSaveIntegrityReview}
      />

      {/* Per-Question Grading Cards */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const grade = attempt.questionGrades[q.id];
          const studentAns = attempt.answers[q.id];
          const key = answerKey[q.id];
          const isSubjective = !isObjectiveQuestionType(q.type);
          const edit = manualEdits[q.id] ?? { marksAwarded: '', feedback: '' };

          return (
            <ClayCard key={q.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Question {idx + 1} · {q.type.replace('_', ' ')} · {q.topic}
                  </span>
                  <h2 className="mt-1 text-base font-bold text-[var(--text-primary)]">
                    {q.prompt}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {grade?.outcome === 'correct' && (
                    <ClayBadge tone="mint">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {grade.marksAwarded} / {q.marks}
                    </ClayBadge>
                  )}
                  {grade?.outcome === 'wrong' && (
                    <ClayBadge tone="coral">
                      <XCircle className="h-3.5 w-3.5" />
                      {grade.marksAwarded} / {q.marks}
                    </ClayBadge>
                  )}
                  {grade?.outcome === 'skipped' && (
                    <ClayBadge tone="neutral">Skipped (0 / {q.marks})</ClayBadge>
                  )}
                  {(!grade || grade.outcome === 'pending_review') && (
                    <ClayBadge tone="amber">
                      <Clock className="h-3.5 w-3.5" />
                      Pending review (0 / {q.marks})
                    </ClayBadge>
                  )}
                </div>
              </div>

              {/* Objective Answer Display */}
              {!isSubjective ? (
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const selected = (studentAns?.selectedOptionIds ?? []).includes(opt.id);
                    const correct = (key?.correctAnswers ?? []).includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`clay-inset flex items-center justify-between rounded-[16px] px-4 py-2.5 text-sm ${
                          correct
                            ? 'bg-[var(--semantic-mint-soft)] text-[var(--semantic-mint-text)]'
                            : selected
                              ? 'bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="font-medium">{opt.text}</span>
                        <div className="flex items-center gap-2 text-xs font-bold">
                          {selected && <span>Student choice</span>}
                          {correct && <span>Correct</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Subjective Student Response + Rubric + Manual Grading Inputs */
                <div className="space-y-4">
                  <div className="clay-inset rounded-[18px] p-4">
                    <p className="text-xs font-bold text-[var(--text-muted)]">Student Response</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                      {studentAns?.textAnswer?.trim() || 'No answer submitted.'}
                    </p>
                  </div>

                  {q.rubric && (
                    <div className="clay-inset rounded-[18px] bg-[var(--accent-soft)]/50 p-3.5 text-xs">
                      <p className="font-bold text-[var(--accent-soft-text)]">Grading Rubric</p>
                      <p className="mt-1 text-[var(--text-secondary)]">{q.rubric}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ClayInput
                      label={`Marks awarded (0–${q.marks})`}
                      type="number"
                      min={0}
                      max={q.marks}
                      step="0.5"
                      value={edit.marksAwarded}
                      onChange={(e) =>
                        setManualEdits((prev) => ({
                          ...prev,
                          [q.id]: { ...edit, marksAwarded: e.target.value },
                        }))
                      }
                      placeholder={`0 to ${q.marks}`}
                    />
                    <div className="sm:col-span-2">
                      <ClayInput
                        label="Professor feedback"
                        value={edit.feedback}
                        onChange={(e) =>
                          setManualEdits((prev) => ({
                            ...prev,
                            [q.id]: { ...edit, feedback: e.target.value },
                          }))
                        }
                        placeholder="Add constructive feedback for the student..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </ClayCard>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <ClayButton
          variant="primary"
          loading={saving}
          onClick={() => void handleSaveGrades()}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save & Publish Grade
        </ClayButton>
      </div>
    </div>
  );
}
