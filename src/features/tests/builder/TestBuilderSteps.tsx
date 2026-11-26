import { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Link as LinkIcon,
  ShieldCheck,
} from 'lucide-react';
import type {
  BuilderQuestion,
  ProctoringPolicy,
  ShowResultMode,
  TestCategory,
  TestSettings,
} from '../../../types';
import { ClayBadge, ClayButton, ClayCard, ClayInput, Toggle } from '../../../components/ui';
import { cn, formatDateTime } from '../../../lib/utils';

const CATEGORIES: TestCategory[] = ['DSA', 'Aptitude', 'Core CS', 'Mathematics', 'Coding'];

export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(val: string, fallbackIso: string): string {
  if (!val) return fallbackIso;
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? fallbackIso : parsed.toISOString();
}

/* ========================= STEP 1: BASIC INFO ========================= */

interface BasicInfoStepProps {
  title: string;
  subject: string;
  category: TestCategory;
  description: string;
  instructions: string;
  onChange: (patch: {
    title?: string;
    subject?: string;
    category?: TestCategory;
    description?: string;
    instructions?: string;
  }) => void;
}

export function BasicInfoStep({
  title,
  subject,
  category,
  description,
  instructions,
  onChange,
}: BasicInfoStepProps) {
  return (
    <ClayCard className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Basic Information</h2>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          Define the assessment title, subject, and student instructions shown before starting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClayInput
          label="Test title"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Data Structures Midterm"
        />
        <ClayInput
          label="Subject / Course"
          value={subject}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="e.g. CS-204 Algorithms"
        />
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold text-[var(--text-primary)]">Category</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onChange({ category: cat })}
              className={cn(
                'cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                category === cat
                  ? 'clay-btn-primary text-white'
                  : 'clay-surface-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="test-description"
          className="block text-xs font-semibold text-[var(--text-primary)]"
        >
          Description
        </label>
        <textarea
          id="test-description"
          rows={3}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Briefly outline the syllabus or scope covered by this assessment..."
          className="clay-inset w-full rounded-[18px] px-4 py-3 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="test-instructions"
          className="block text-xs font-semibold text-[var(--text-primary)]"
        >
          Student instructions
        </label>
        <textarea
          id="test-instructions"
          rows={4}
          value={instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
          placeholder="Rules students must acknowledge before starting the timer..."
          className="clay-inset w-full rounded-[18px] px-4 py-3 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        />
      </div>
    </ClayCard>
  );
}

/* ========================= STEP 3: SETTINGS ========================= */

interface SettingsStepProps {
  settings: TestSettings;
  proctoring: ProctoringPolicy;
  totalMarks: number;
  onChange: (next: TestSettings) => void;
  onProctoringChange: (next: ProctoringPolicy) => void;
}

export function SettingsStep({
  settings,
  proctoring,
  totalMarks,
  onChange,
  onProctoringChange,
}: SettingsStepProps) {
  const update = (patch: Partial<TestSettings>) => onChange({ ...settings, ...patch });
  const updateProctoring = (patch: Partial<ProctoringPolicy>) =>
    onProctoringChange({ ...proctoring, ...patch });

  return (
    <div className="space-y-5">
      <ClayCard className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Schedule & Limits</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Configure exam timing, availability window, attempt limit, and passing threshold.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ClayInput
            label="Duration (minutes)"
            type="number"
            min={1}
            max={360}
            value={String(settings.durationMinutes)}
            onChange={(e) => update({ durationMinutes: Math.max(1, Number(e.target.value) || 1) })}
          />
          <ClayInput
            label="Attempt limit"
            type="number"
            min={1}
            max={20}
            value={String(settings.attemptLimit)}
            onChange={(e) => update({ attemptLimit: Math.max(1, Number(e.target.value) || 1) })}
          />
          <ClayInput
            label={`Passing marks (of ${totalMarks})`}
            type="number"
            min={0}
            max={Math.max(totalMarks, 500)}
            value={String(settings.passingMarks)}
            onChange={(e) => update({ passingMarks: Math.max(0, Number(e.target.value) || 0) })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ClayInput
            label="Start schedule"
            type="datetime-local"
            value={toDateTimeLocalValue(settings.startTime)}
            onChange={(e) =>
              update({ startTime: fromDateTimeLocalValue(e.target.value, settings.startTime) })
            }
          />
          <ClayInput
            label="End schedule"
            type="datetime-local"
            value={toDateTimeLocalValue(settings.endTime)}
            onChange={(e) =>
              update({ endTime: fromDateTimeLocalValue(e.target.value, settings.endTime) })
            }
          />
        </div>
      </ClayCard>

      <ClayCard className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Delivery & Grading</h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Control question randomization, negative marking, and when students see full results.
          </p>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={settings.shuffleQuestions}
            onChange={(checked) => update({ shuffleQuestions: checked })}
            label="Shuffle question order"
            description="Each student receives a unique order saved in their attempt so refreshes preserve it."
          />
          <Toggle
            checked={settings.shuffleOptions}
            onChange={(checked) => update({ shuffleOptions: checked })}
            label="Shuffle answer options"
            description="Randomize MCQ and multiple-correct choices per student attempt."
          />
          <Toggle
            checked={settings.negativeMarking}
            onChange={(checked) => update({ negativeMarking: checked })}
            label="Enable negative marking"
            description="Deduct each question's configured negative marks on wrong objective answers."
          />
          <Toggle
            checked={Boolean(settings.showRankToStudents)}
            onChange={(checked) => update({ showRankToStudents: checked })}
            label="Show rank among test takers"
            description="Allow students to see their rank (e.g. #2 of 40) on results and analytics."
          />
        </div>

        <div className="space-y-2 pt-2">
          <span className="block text-xs font-semibold text-[var(--text-primary)]">
            Result visibility
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: 'immediate',
                  title: 'Show immediately',
                  desc: 'Students see objective score, correct answers, and explanations upon submit.',
                },
                {
                  value: 'after_review',
                  title: 'Show after professor review',
                  desc: 'Hold answer keys and detailed breakdown until you grade and publish.',
                },
              ] as Array<{ value: ShowResultMode; title: string; desc: string }>
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ showResultMode: opt.value })}
                className={cn(
                  'cursor-pointer rounded-[20px] p-4 text-left transition-all',
                  settings.showResultMode === opt.value
                    ? 'clay-inset bg-[var(--accent-soft)] ring-2 ring-[var(--accent-primary)]/40'
                    : 'clay-surface-sm'
                )}
              >
                <p className="text-sm font-bold text-[var(--text-primary)]">{opt.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </ClayCard>

      {/* Monitoring & Proctoring Policy */}
      <ClayCard className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Session Monitoring (Proctoring)
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Transparent browser monitoring logs tab switches, fullscreen exits, reloads, and
              blocked clipboard shortcuts. Sessions are monitored — not cheat-proof.
            </p>
          </div>
          <ClayBadge tone={proctoring.enabled ? 'purple' : 'neutral'}>
            {proctoring.enabled ? 'Monitored' : 'Standard'}
          </ClayBadge>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={proctoring.enabled}
            onChange={(checked) => updateProctoring({ enabled: checked })}
            label="Enable session monitoring"
            description="Show a pre-test checklist to students and log monitoring events to the submission timeline."
          />

          {proctoring.enabled && (
            <div className="clay-inset space-y-4 rounded-[20px] p-4">
              <Toggle
                checked={proctoring.fullscreenRequired}
                onChange={(checked) => updateProctoring({ fullscreenRequired: checked })}
                label="Require fullscreen mode"
                description="Prompt fullscreen before start and log a warning if the student exits fullscreen."
              />
              <Toggle
                checked={proctoring.blockCopyPaste}
                onChange={(checked) => updateProctoring({ blockCopyPaste: checked })}
                label="Block copy, paste, cut & right-click"
                description="Prevent clipboard actions, context menu, and restricted keyboard shortcuts during the attempt."
              />
              <Toggle
                checked={proctoring.autoSubmitOnLimit}
                onChange={(checked) => updateProctoring({ autoSubmitOnLimit: checked })}
                label="Auto-submit when warning limit is reached"
                description="Automatically submit saved answers with a clear reason once the student hits the warning limit."
              />

              <div className="max-w-xs pt-1">
                <ClayInput
                  label="Warning limit (tab switches / violations)"
                  type="number"
                  min={1}
                  max={15}
                  value={String(proctoring.maxTabSwitches)}
                  onChange={(e) =>
                    updateProctoring({
                      maxTabSwitches: Math.max(1, Math.min(15, Number(e.target.value) || 3)),
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </ClayCard>
    </div>
  );
}

/* ========================= STEP 4: REVIEW & PUBLISH ========================= */

interface ReviewPublishStepProps {
  title: string;
  subject: string;
  category: TestCategory;
  code: string;
  published: boolean;
  settings: TestSettings;
  proctoring: ProctoringPolicy;
  questions: BuilderQuestion[];
  validationErrors: string[];
  onJumpToStep: (step: number) => void;
}

export function ReviewPublishStep({
  title,
  subject,
  category,
  code,
  published,
  settings,
  proctoring,
  questions,
  validationErrors,
  onJumpToStep,
}: ReviewPublishStepProps) {
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const objectiveCount = questions.filter(
    (q) => q.type === 'mcq' || q.type === 'multi_select' || q.type === 'true_false'
  ).length;
  const subjectiveCount = questions.length - objectiveCount;
  const shareUrl = `${window.location.origin}/join/${code}`;

  const copyValue = async (text: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  return (
    <div className="space-y-5">
      {/* Validation Banner */}
      {validationErrors.length > 0 ? (
        <ClayCard className="bg-[var(--semantic-coral-soft)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--semantic-coral-text)]" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--semantic-coral-text)]">
                Fix {validationErrors.length} {validationErrors.length === 1 ? 'item' : 'items'}{' '}
                before publishing
              </h3>
              <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--semantic-coral-text)]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <ClayButton variant="secondary" size="sm" onClick={() => onJumpToStep(0)}>
                  Edit Basic Info
                </ClayButton>
                <ClayButton variant="secondary" size="sm" onClick={() => onJumpToStep(1)}>
                  Edit Questions
                </ClayButton>
                <ClayButton variant="secondary" size="sm" onClick={() => onJumpToStep(2)}>
                  Edit Settings
                </ClayButton>
              </div>
            </div>
          </div>
        </ClayCard>
      ) : (
        <ClayCard className="bg-[var(--semantic-mint-soft)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--semantic-mint-text)]" />
            <div>
              <p className="text-sm font-bold text-[var(--semantic-mint-text)]">
                Ready to publish
              </p>
              <p className="text-xs text-[var(--semantic-mint-text)]/90">
                All required fields, schedule settings, and answer keys passed validation.
              </p>
            </div>
          </div>
        </ClayCard>
      )}

      {/* Access Code & Shareable Link */}
      <ClayCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Student Access</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Share this 6-character code or direct link once published.
            </p>
          </div>
          <ClayBadge tone={published ? 'mint' : 'amber'}>
            {published ? 'Published' : 'Draft'}
          </ClayBadge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="clay-inset flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Join Code</p>
              <p className="mt-0.5 font-mono-tabular text-xl font-extrabold tracking-widest text-[var(--accent-primary)]">
                {code}
              </p>
            </div>
            <ClayButton
              variant="secondary"
              size="sm"
              onClick={() => void copyValue(code, 'code')}
              leftIcon={
                copiedField === 'code' ? (
                  <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
            >
              {copiedField === 'code' ? 'Copied' : 'Copy code'}
            </ClayButton>
          </div>

          <div className="clay-inset flex items-center justify-between gap-3 rounded-[20px] px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)]">Shareable Link</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-primary)]">
                {shareUrl}
              </p>
            </div>
            <ClayButton
              variant="secondary"
              size="sm"
              onClick={() => void copyValue(shareUrl, 'link')}
              leftIcon={
                copiedField === 'link' ? (
                  <Check className="h-3.5 w-3.5 text-[var(--semantic-mint-text)]" />
                ) : (
                  <LinkIcon className="h-3.5 w-3.5" />
                )
              }
            >
              {copiedField === 'link' ? 'Copied' : 'Copy link'}
            </ClayButton>
          </div>
        </div>
      </ClayCard>

      {/* Assessment Summary */}
      <ClayCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Assessment Summary</h2>
          <ClayBadge tone="purple">{category}</ClayBadge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] text-[var(--text-muted)]">Questions</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {questions.length}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {objectiveCount} auto · {subjectiveCount} manual
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] text-[var(--text-muted)]">Total Marks</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {totalMarks}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Pass: {settings.passingMarks}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] text-[var(--text-muted)]">Duration</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {settings.durationMinutes}m
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Max {settings.attemptLimit} {settings.attemptLimit === 1 ? 'attempt' : 'attempts'}
            </p>
          </div>
          <div className="clay-inset rounded-[18px] p-3.5">
            <p className="text-[11px] text-[var(--text-muted)]">Negative Marking</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">
              {settings.negativeMarking ? 'On' : 'Off'}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {settings.showResultMode === 'immediate' ? 'Immediate result' : 'After review'}
            </p>
          </div>
        </div>

        <div className="clay-inset space-y-1.5 rounded-[18px] p-4 text-xs text-[var(--text-secondary)]">
          <p className="font-bold text-[var(--text-primary)]">
            {title || 'Untitled Assessment'} — {subject || 'No subject'}
          </p>
          <p>
            Window: {formatDateTime(settings.startTime)} to {formatDateTime(settings.endTime)}
          </p>
          <p>
            Monitoring:{' '}
            <strong className="text-[var(--text-primary)]">
              {proctoring.enabled
                ? `Enabled (limit ${proctoring.maxTabSwitches} warnings · ${
                    proctoring.fullscreenRequired ? 'Fullscreen required' : 'Fullscreen optional'
                  } · ${proctoring.blockCopyPaste ? 'Copy/paste blocked' : 'Clipboard allowed'} · ${
                    proctoring.autoSubmitOnLimit ? 'Auto-submit on limit' : 'Log only'
                  })`
                : 'Disabled'}
            </strong>
            {' · '}Rank visibility:{' '}
            <strong className="text-[var(--text-primary)]">
              {settings.showRankToStudents ? 'Visible to students' : 'Hidden'}
            </strong>
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-[var(--semantic-mint-text)]">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              Answer keys are stored privately in <code>tests/{'{id}'}/private/answerKey</code>,
              isolated from student question documents.
            </span>
          </div>
        </div>
      </ClayCard>
    </div>
  );
}
