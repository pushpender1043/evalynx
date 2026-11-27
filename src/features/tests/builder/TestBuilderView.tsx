import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Link as LinkIcon,
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
} from '../../../lib/grading';
import { validateTestPublishIssues } from '../../../lib/testValidation';
import { mapFirebaseError } from '../../../lib/firebaseErrors';
import { cn, downloadTextFile } from '../../../lib/utils';
import { testService } from '../../../services/testService';
import { questionBankService } from '../../../services/questionBankService';
import { isDemoModeActive, isDemoReadOnlyError, triggerDemoWriteGuard } from '../../demo';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import {
  ClayBadge,
  ClayButton,
  ClayCard,
  EmptyState,
  Loader,
  Modal,
} from '../../../components/ui';
import {
  CreateTestIllustration,
  EmptyTestsIllustration,
} from '../../../components/illustrations';
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
  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState<number | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState<{
    testId: string;
    title: string;
    code: string;
  } | null>(null);
  const [copiedSuccessField, setCopiedSuccessField] = useState<'code' | 'link' | null>(null);

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

  const validationIssues = useMemo(
    () =>
      validateTestPublishIssues({
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

  const performSave = async (publishFlag: boolean, isAutoSave = false): Promise<boolean> => {
    if (!user) return false;
    if (isDemoModeActive()) {
      if (!isAutoSave) {
        triggerDemoWriteGuard(publishFlag ? 'publish a test' : 'save test changes');
      }
      return false;
    }
    if (isAutoSave && (!title.trim() || saving || publishing)) return false;

    if (publishFlag) {
      if (validationIssues.length > 0) {
        setStep(3);
        setActionError('Please resolve all validation issues before publishing.');
        return false;
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
          setPublishedSuccess({
            testId: saved.test.id,
            title: saved.test.title,
            code: saved.test.code,
          });
        }
      }
      return true;
    } catch (err) {
      if (isDemoReadOnlyError(err)) return false;
      const friendly = mapFirebaseError(err, 'Could not save test to Firestore.');
      if (!isAutoSave) {
        setActionError(friendly);
      }
      return false;
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

  // Warn browser before reload/tab-close if unsaved changes exist
  useEffect(() => {
    if (!dirty || isDemoModeActive()) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const handleStepChange = (nextStep: number) => {
    const clamped = Math.max(0, Math.min(3, nextStep));
    if (clamped === step) return;
    if (dirty && title.trim() && !isDemoModeActive() && !saving && !publishing) {
      void performSave(published, true);
    }
    setStep(clamped);
  };

  const handleBackNavigation = () => {
    if (dirty && !isDemoModeActive()) {
      setLeaveConfirmOpen(true);
      return;
    }
    navigate('/professor/tests');
  };

  const handleCopySuccessValue = async (text: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuccessField(field);
      pushToast({
        title: field === 'code' ? 'Join code copied' : 'Shareable link copied',
        description: text,
        tone: 'success',
      });
      window.setTimeout(() => setCopiedSuccessField(null), 2000);
    } catch {
      pushToast({
        title: 'Copy failed',
        description: 'Copy the code manually from this screen.',
        tone: 'warning',
      });
    }
  };

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

  if (publishedSuccess) {
    const shareUrl = `${window.location.origin}/join/${publishedSuccess.code}`;
    return (
      <div className="mx-auto max-w-2xl py-6">
        <ClayCard className="space-y-6 p-7 sm:p-9 text-center">
          <div className="flex flex-col items-center gap-3">
            <CreateTestIllustration size={132} />
            <ClayBadge tone="mint">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Test Published
            </ClayBadge>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {publishedSuccess.title}
            </h1>
            <p className="max-w-md text-xs text-[var(--text-secondary)]">
              Your assessment is saved in Firestore and ready to share with students using the
              unique join code or link below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <div className="clay-inset flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5">
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">Join Code</p>
                <p className="mt-0.5 font-mono-tabular text-2xl font-extrabold tracking-widest text-[var(--accent-primary)]">
                  {publishedSuccess.code}
                </p>
              </div>
              <ClayButton
                variant="secondary"
                size="sm"
                onClick={() => void handleCopySuccessValue(publishedSuccess.code, 'code')}
                leftIcon={
                  copiedSuccessField === 'code' ? (
                    <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
              >
                {copiedSuccessField === 'code' ? 'Copied' : 'Copy'}
              </ClayButton>
            </div>

            <div className="clay-inset flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Shareable Link
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
                  {shareUrl}
                </p>
              </div>
              <ClayButton
                variant="secondary"
                size="sm"
                onClick={() => void handleCopySuccessValue(shareUrl, 'link')}
                leftIcon={
                  copiedSuccessField === 'link' ? (
                    <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                  ) : (
                    <LinkIcon className="h-3.5 w-3.5" />
                  )
                }
              >
                {copiedSuccessField === 'link' ? 'Copied' : 'Copy'}
              </ClayButton>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Note: Published tests stay editable only before the first student attempt exists.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <ClayButton variant="secondary" onClick={() => setPublishedSuccess(null)}>
              Continue Editing
            </ClayButton>
            <ClayButton variant="navy" onClick={() => navigate('/professor/tests')}>
              Go to Tests
            </ClayButton>
          </div>
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Builder Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ClayButton
            variant="icon"
            size="sm"
            onClick={handleBackNavigation}
            aria-label="Back to tests"
          >
            <ArrowLeft className="h-4 w-4" />
          </ClayButton>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
                {testId ? 'Edit Test' : 'Create Test'}
              </h1>
              <ClayBadge tone={published ? 'mint' : 'neutral'}>
                {published ? 'Published' : 'Draft'}
              </ClayBadge>
              {saving ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
                  Saving...
                </span>
              ) : lastSavedAt ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                  <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                  Saved {lastSavedAt}
                </span>
              ) : dirty && !isDemoModeActive() ? (
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Unsaved changes
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Auto-saves drafts every 10s and on step change · Code{' '}
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
            variant="navy"
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
                onClick={() => handleStepChange(s.id)}
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

      {/* Persistent Live Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[var(--bg-surface-tinted)] px-4 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <span className="text-[var(--text-secondary)]">
            Questions:{' '}
            <strong className="font-bold text-[var(--text-primary)]">{questions.length}</strong>
          </span>
          <span className="text-[var(--text-secondary)]">
            Total marks:{' '}
            <strong className="font-bold text-[var(--text-primary)]">{totalMarks}</strong>
          </span>
          <span className="text-[var(--text-secondary)]">
            Duration:{' '}
            <strong className="font-bold text-[var(--text-primary)]">
              {settings.durationMinutes} min
            </strong>
          </span>
          <span className="text-[var(--text-secondary)]">
            Pass:{' '}
            <strong className="font-bold text-[var(--text-primary)]">
              {settings.passingMarks}
            </strong>
          </span>
        </div>

        <span className="font-semibold text-[var(--text-muted)]">
          {saving
            ? 'Saving...'
            : isDemoModeActive()
              ? 'Demo preview (read-only)'
              : dirty
                ? 'Unsaved changes'
                : lastSavedAt
                  ? `Saved at ${lastSavedAt}`
                  : 'Ready'}
        </span>
      </div>

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
            <EmptyState
              illustration={<EmptyTestsIllustration size={128} />}
              title="No questions yet"
              description="Add MCQ, Multiple-Correct, True/False, Short Answer, or Long Answer questions, or import a batch from CSV."
              actionLabel="Add First Question"
              onAction={handleAddQuestion}
            />
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
                  onDelete={() => setDeleteQuestionIndex(idx)}
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
          validationIssues={validationIssues}
          onJumpToStep={handleStepChange}
        />
      )}

      {/* Bottom Step Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <ClayButton
          variant="secondary"
          disabled={step === 0}
          onClick={() => handleStepChange(step - 1)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Previous
        </ClayButton>

        {step < 3 ? (
          <ClayButton
            variant="primary"
            onClick={() => handleStepChange(step + 1)}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Next step
          </ClayButton>
        ) : (
          <ClayButton
            variant="navy"
            loading={publishing}
            disabled={validationIssues.length > 0}
            onClick={() => void performSave(true)}
            leftIcon={<Send className="h-4 w-4" />}
          >
            {published ? 'Update Published Test' : 'Publish Test'}
          </ClayButton>
        )}
      </div>

      {/* Delete Question Confirmation Modal */}
      <Modal
        open={deleteQuestionIndex !== null}
        onClose={() => setDeleteQuestionIndex(null)}
        title={
          deleteQuestionIndex !== null
            ? `Delete Question ${deleteQuestionIndex + 1}?`
            : 'Delete question?'
        }
        description="This removes the question and its answer key from this assessment."
      >
        <div className="flex justify-end gap-2.5 pt-2">
          <ClayButton variant="secondary" size="sm" onClick={() => setDeleteQuestionIndex(null)}>
            Cancel
          </ClayButton>
          <ClayButton
            variant="danger"
            size="sm"
            onClick={() => {
              if (deleteQuestionIndex !== null) {
                handleDeleteQuestion(deleteQuestionIndex);
              }
              setDeleteQuestionIndex(null);
            }}
          >
            Delete question
          </ClayButton>
        </div>
      </Modal>

      {/* Unsaved Changes Leave Confirmation Modal */}
      <Modal
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title="Leave with unsaved changes?"
        description="You have unsaved edits in this test. Save your draft before leaving or discard them."
      >
        <div className="flex flex-wrap justify-end gap-2.5 pt-2">
          <ClayButton variant="secondary" size="sm" onClick={() => setLeaveConfirmOpen(false)}>
            Keep editing
          </ClayButton>
          <ClayButton
            variant="danger"
            size="sm"
            onClick={() => {
              setDirty(false);
              setLeaveConfirmOpen(false);
              navigate('/professor/tests');
            }}
          >
            Discard & leave
          </ClayButton>
          <ClayButton
            variant="primary"
            size="sm"
            loading={saving}
            onClick={async () => {
              const ok = await performSave(false);
              if (ok) {
                setLeaveConfirmOpen(false);
                navigate('/professor/tests');
              }
            }}
          >
            Save draft & leave
          </ClayButton>
        </div>
      </Modal>
    </div>
  );
}
