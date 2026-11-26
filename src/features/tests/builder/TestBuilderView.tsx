import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Plus,
  Save,
  Send,
  Upload,
} from 'lucide-react';
import type {
  BuilderQuestion,
  ProctoringPolicy,
  TestCategory,
  TestSettings,
} from '../../../types';
import {
  generateQuestionsCsvTemplate,
  generateSixCharJoinCode,
  parseQuestionsCsv,
  validateTestForPublish,
} from '../../../lib/grading';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn, downloadTextFile } from '../../../lib/utils';
import { testService } from '../../../services/testService';
import { questionBankService } from '../../../services/questionBankService';
import { isDemoModeActive, isDemoReadOnlyError, triggerDemoWriteGuard } from '../../demo';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { ClayBadge, ClayButton, ClayCard, Loader } from '../../../components/ui';
import { QuestionEditorCard } from './QuestionEditorCard';
import { BasicInfoStep, ReviewPublishStep, SettingsStep } from './TestBuilderSteps';

const STEPS = [
  { id: 0, label: '1. Basic Info' },
  { id: 1, label: '2. Questions' },
  { id: 2, label: '3. Settings' },
  { id: 3, label: '4. Review & Publish' },
];

function createEmptyQuestion(order: number): BuilderQuestion {
  const ts = Date.now();
  return {
    id: `q-${ts}-${Math.random().toString(36).slice(2, 6)}`,
    order,
    type: 'mcq',
    prompt: '',
    options: [
      { id: `opt-${ts}-a`, text: '' },
      { id: `opt-${ts}-b`, text: '' },
      { id: `opt-${ts}-c`, text: '' },
      { id: `opt-${ts}-d`, text: '' },
    ],
    correctAnswers: [],
    marks: 2,
    negativeMarks: 0,
    difficulty: 'medium',
    topic: 'General',
    explanation: '',
    rubric: '',
  };
}

function createDefaultSettings(): TestSettings {
  const now = new Date();
  const start = new Date(now.getTime() - 5 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 86400 * 1000);
  return {
    durationMinutes: 45,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    shuffleQuestions: false,
    shuffleOptions: false,
    negativeMarking: false,
    attemptLimit: 1,
    showResultMode: 'immediate',
    passingMarks: 1,
    showRankToStudents: false,
  };
}

function createDefaultProctoring(): ProctoringPolicy {
  return {
    enabled: false,
    fullscreenRequired: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    webcamEnabled: false,
    autoSubmitOnLimit: true,
  };
}

export function TestBuilderView() {
  const { id: routeTestId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUIStore((s) => s.pushToast);
  const loadWorkspaceData = useUIStore((s) => s.loadWorkspaceData);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(Boolean(routeTestId));
  const [loadError, setLoadError] = useState<string | null>(null);

  const [testId, setTestId] = useState<string | undefined>(routeTestId);
  const [code, setCode] = useState<string>(() => generateSixCharJoinCode());
  const [published, setPublished] = useState(false);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TestCategory>('Core CS');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState(
    'Read every question carefully. Your progress is auto-saved, and the test will auto-submit when the timer ends.'
  );
  const [settings, setSettings] = useState<TestSettings>(() => createDefaultSettings());
  const [proctoring, setProctoring] = useState<ProctoringPolicy>(() => createDefaultProctoring());
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Load existing test when editing `/professor/tests/:id/edit`
  useEffect(() => {
    if (!routeTestId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);

    void testService
      .getTestWithPrivateKey(routeTestId)
      .then((res) => {
        if (!active) return;
        if (!res) {
          setLoadError('Test not found or you do not have permission to edit it.');
          setLoading(false);
          return;
        }
        setTestId(res.test.id);
        setCode(res.test.code || generateSixCharJoinCode());
        setPublished(res.test.published);
        setTitle(res.test.title);
        setSubject(res.test.subject);
        setCategory(res.test.category);
        setDescription(res.test.description || '');
        setInstructions(res.test.instructions || '');
        setSettings(res.test.settings);
        setProctoring(res.test.proctoring);
        setQuestions(res.questions);
        setDirty(false);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(mapFirebaseError(err, 'Unable to load test for editing.'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [routeTestId]);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
    [questions]
  );

  const validationErrors = useMemo(
    () =>
      validateTestForPublish({
        title,
        subject,
        durationMinutes: settings.durationMinutes,
        startTime: settings.startTime,
        endTime: settings.endTime,
        attemptLimit: settings.attemptLimit,
        passingMarks: settings.passingMarks,
        questions,
      }),
    [title, subject, settings, questions]
  );

  const performSave = async (publishFlag: boolean, isAutoSave = false) => {
    if (!user) return;
    if (isDemoModeActive()) {
      if (!isAutoSave) {
        triggerDemoWriteGuard(publishFlag ? 'publish a test' : 'save test changes');
      }
      return;
    }
    if (isAutoSave && (!title.trim() || saving || publishing)) return;

    if (publishFlag) {
      if (validationErrors.length > 0) {
        setStep(3);
        setActionError('Please resolve all validation issues before publishing.');
        return;
      }
      setPublishing(true);
    } else {
      setSaving(true);
    }
    setActionError(null);

    try {
      const saved = await testService.saveTestBuilder({
        testId,
        professor: user,
        title: title.trim() || 'Untitled Draft',
        subject,
        description,
        instructions,
        category,
        code,
        settings,
        proctoring,
        questions,
        publish: publishFlag,
      });

      setTestId(saved.test.id);
      setCode(saved.test.code);
      setPublished(saved.test.published);
      setDirty(false);
      setLastSavedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      if (!routeTestId && saved.test.id) {
        window.history.replaceState(null, '', `/professor/tests/${saved.test.id}/edit`);
      }

      if (!isAutoSave) {
        void loadWorkspaceData(user);
        pushToast({
          title: publishFlag ? 'Test published!' : 'Draft saved',
          description: publishFlag
            ? `Join code ${saved.test.code} is ready to share with students.`
            : 'Your changes have been saved to Firestore.',
          tone: 'success',
        });
        if (publishFlag) {
          navigate('/professor/tests');
        }
      }
    } catch (err) {
      if (isDemoReadOnlyError(err)) return;
      const friendly = mapFirebaseError(err, 'Could not save test to Firestore.');
      if (!isAutoSave) {
        setActionError(friendly);
      }
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  // Auto-save every 10s when dirty and title is provided (skipped in demo mode)
  useEffect(() => {
    if (!dirty || !title.trim() || loading || isDemoModeActive()) return;
    const timer = window.setInterval(() => {
      void performSave(published, true);
    }, 10_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, title, subject, category, description, instructions, settings, proctoring, questions, published, testId]);

  const markDirty = () => setDirty(true);

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)]);
    markDirty();
  };

  const handleUpdateQuestion = (idx: number, updated: BuilderQuestion) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));
    markDirty();
  };

  const handleDuplicateQuestion = (idx: number) => {
    setQuestions((prev) => {
      const src = prev[idx];
      if (!src) return prev;
      const clone: BuilderQuestion = {
        ...src,
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        options: src.options.map((o) => ({ ...o })),
        correctAnswers: [...src.correctAnswers],
        savedToBank: false,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next.map((q, i) => ({ ...q, order: i }));
    });
    markDirty();
  };

  const handleDeleteQuestion = (idx: number) => {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i }))
    );
    markDirty();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((q, i) => ({ ...q, order: i }));
    });
    markDirty();
  };

  const handleDownloadTemplate = () => {
    const csv = generateQuestionsCsvTemplate();
    downloadTextFile('evalynx-questions-template.csv', csv, 'text/csv;charset=utf-8');
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseQuestionsCsv(text, questions.length);
      if (parsed.questions.length > 0) {
        setQuestions((prev) => [...prev, ...parsed.questions]);
        markDirty();
        pushToast({
          title: `Imported ${parsed.questions.length} questions`,
          description:
            parsed.errors.length > 0
              ? `${parsed.errors.length} row(s) skipped due to formatting issues.`
              : 'Questions added to your test.',
          tone: parsed.errors.length > 0 ? 'warning' : 'success',
        });
      } else {
        setActionError(parsed.errors[0] || 'No valid questions found in CSV.');
      }
    } catch {
      setActionError('Unable to read the CSV file.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="md" />
      </div>
    );
  }

  if (loadError) {
    return (
      <ClayCard className="space-y-4 py-10 text-center">
        <p className="text-sm font-bold text-[var(--semantic-coral-text)]">{loadError}</p>
        <ClayButton variant="secondary" onClick={() => navigate('/professor/tests')}>
          Back to Tests
        </ClayButton>
      </ClayCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Builder Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {testId ? 'Edit Test' : 'Create Test'}
              </h1>
              <ClayBadge tone={published ? 'mint' : 'amber'}>
                {published ? 'Published' : 'Draft'}
              </ClayBadge>
              {lastSavedAt && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                  <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                  Saved {lastSavedAt}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Auto-saves drafts every 10 seconds · Code{' '}
              <strong className="font-mono-tabular text-[var(--accent-primary)]">{code}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ClayButton
            variant="secondary"
            size="sm"
            loading={saving}
            onClick={() => void performSave(false)}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Draft
          </ClayButton>
          <ClayButton
            variant="primary"
            size="sm"
            loading={publishing}
            onClick={() => void performSave(true)}
            leftIcon={<Send className="h-4 w-4" />}
          >
            {published ? 'Update Published' : 'Publish Test'}
          </ClayButton>
        </div>
      </div>

      {/* Step Indicator */}
      <nav aria-label="Test builder steps" className="clay-card p-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={cn(
                  'cursor-pointer rounded-[18px] px-3 py-2.5 text-xs font-bold transition-all',
                  active
                    ? 'clay-btn-primary text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                {s.label}
                {s.id === 1 && questions.length > 0 ? ` (${questions.length})` : ''}
              </button>
            );
          })}
        </div>
      </nav>

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-medium text-[var(--semantic-coral-text)] shadow-[var(--shadow-clay-sm)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Step Content */}
      {step === 0 && (
        <BasicInfoStep
          title={title}
          subject={subject}
          category={category}
          description={description}
          instructions={instructions}
          onChange={(patch) => {
            if (patch.title !== undefined) setTitle(patch.title);
            if (patch.subject !== undefined) setSubject(patch.subject);
            if (patch.category !== undefined) setCategory(patch.category);
            if (patch.description !== undefined) setDescription(patch.description);
            if (patch.instructions !== undefined) setInstructions(patch.instructions);
            markDirty();
          }}
        />
      )}

      {step === 1 && (
        <div className="space-y-4">
          {/* Questions Toolbar */}
          <ClayCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Questions ({questions.length})
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Total marks: <strong className="tabular-nums">{totalMarks}</strong> · Drag cards to
                reorder or bulk import via CSV.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleImportCsv(e)}
                className="hidden"
              />
              <ClayButton
                variant="secondary"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                CSV Template
              </ClayButton>
              <ClayButton
                variant="secondary"
                size="sm"
                onClick={() => csvInputRef.current?.click()}
                leftIcon={<Upload className="h-3.5 w-3.5" />}
              >
                Import CSV
              </ClayButton>
              <ClayButton
                variant="primary"
                size="sm"
                onClick={handleAddQuestion}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Question
              </ClayButton>
            </div>
          </ClayCard>

          {questions.length === 0 ? (
            <ClayCard className="py-12 text-center">
              <p className="text-base font-bold text-[var(--text-primary)]">No questions yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-secondary)]">
                Add MCQ, Multiple-Correct, True/False, Short Answer, or Long Answer questions, or
                import a batch from CSV.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <ClayButton
                  variant="primary"
                  onClick={handleAddQuestion}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add First Question
                </ClayButton>
              </div>
            </ClayCard>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionEditorCard
                  key={q.id}
                  question={q}
                  index={idx}
                  totalCount={questions.length}
                  negativeMarkingEnabled={settings.negativeMarking}
                  isDragging={dragIndex === idx}
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) handleReorder(dragIndex, idx);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  onChange={(updated) => handleUpdateQuestion(idx, updated)}
                  onDuplicate={() => handleDuplicateQuestion(idx)}
                  onDelete={() => handleDeleteQuestion(idx)}
                  onMoveUp={() => handleReorder(idx, idx - 1)}
                  onMoveDown={() => handleReorder(idx, idx + 1)}
                  onSaveToBank={async () => {
                    if (triggerDemoWriteGuard('save questions to your Question Bank')) return;
                    if (!user) return;
                    if (!q.prompt.trim()) {
                      pushToast({
                        title: 'Add question text first',
                        description: 'Write the question prompt before saving to your bank.',
                        tone: 'warning',
                      });
                      return;
                    }
                    try {
                      await questionBankService.saveQuestionToBank({
                        ownerId: user.uid,
                        subject,
                        question: q,
                      });
                      handleUpdateQuestion(idx, { ...q, savedToBank: true });
                      pushToast({
                        title: 'Saved to Question Bank',
                        description: 'Question added to your reusable Firestore bank.',
                        tone: 'success',
                      });
                    } catch (err) {
                      if (isDemoReadOnlyError(err)) return;
                      pushToast({
                        title: 'Could not save to bank',
                        description: mapFirebaseError(err),
                        tone: 'danger',
                      });
                    }
                  }}
                  onUploadImage={async (file) => {
                    if (!user) throw new Error('Sign in required to upload images.');
                    return await testService.uploadQuestionImage(
                      user.uid,
                      testId || 'draft',
                      q.id,
                      file
                    );
                  }}
                />
              ))}

              <div className="flex justify-center pt-2">
                <ClayButton
                  variant="secondary"
                  onClick={handleAddQuestion}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Add another question
                </ClayButton>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <SettingsStep
          settings={settings}
          proctoring={proctoring}
          totalMarks={totalMarks}
          onChange={(next) => {
            setSettings(next);
            markDirty();
          }}
          onProctoringChange={(next) => {
            setProctoring(next);
            markDirty();
          }}
        />
      )}

      {step === 3 && (
        <ReviewPublishStep
          title={title}
          subject={subject}
          category={category}
          code={code}
          published={published}
          settings={settings}
          proctoring={proctoring}
          questions={questions}
          validationErrors={validationErrors}
          onJumpToStep={setStep}
        />
      )}

      {/* Bottom Step Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <ClayButton
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Previous
        </ClayButton>

        {step < 3 ? (
          <ClayButton
            variant="primary"
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Next step
          </ClayButton>
        ) : (
          <ClayButton
            variant="primary"
            loading={publishing}
            disabled={validationErrors.length > 0}
            onClick={() => void performSave(true)}
            leftIcon={<Send className="h-4 w-4" />}
          >
            {published ? 'Update Published Test' : 'Publish Test'}
          </ClayButton>
        )}
      </div>
    </div>
  );
}
