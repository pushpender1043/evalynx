import {
  AlertTriangle,
  CheckCircle2,
  ClipboardX,
  EyeOff,
  Flag,
  Keyboard,
  Maximize2,
  MousePointerClick,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ClayBadge, ClayButton, ClayCard, ProgressRing } from '../../components/ui';
import type { AttemptViolation, RiskLevel, TestAttempt, ViolationType } from '../../types';

interface ViolationTimelineCardProps {
  attempt: TestAttempt;
  violations: AttemptViolation[];
  isReadOnlyDemo?: boolean;
  onSaveReview: (payload: { flagged: boolean; cleared: boolean; note: string }) => Promise<void>;
}

const VIOLATION_ICONS: Record<ViolationType, typeof AlertTriangle> = {
  tab_switch: EyeOff,
  window_blur: EyeOff,
  fullscreen_exit: Maximize2,
  copy: ClipboardX,
  paste: ClipboardX,
  cut: ClipboardX,
  right_click: MousePointerClick,
  shortcut_blocked: Keyboard,
  page_reload: RefreshCw,
};

function getRiskMeta(risk: RiskLevel): {
  label: string;
  tone: 'mint' | 'amber' | 'coral';
  accent: 'mint' | 'amber' | 'coral';
} {
  if (risk === 'high') {
    return { label: 'High Risk', tone: 'coral', accent: 'coral' };
  }
  if (risk === 'medium') {
    return { label: 'Medium Risk', tone: 'amber', accent: 'amber' };
  }
  return { label: 'Low Risk', tone: 'mint', accent: 'mint' };
}

export function ViolationTimelineCard({
  attempt,
  violations,
  isReadOnlyDemo = false,
  onSaveReview,
}: ViolationTimelineCardProps) {
  const [note, setNote] = useState(attempt.professorFlagNote ?? '');
  const [savingAction, setSavingAction] = useState<'flag' | 'clear' | null>(null);

  useEffect(() => {
    setNote(attempt.professorFlagNote ?? '');
  }, [attempt.id, attempt.professorFlagNote]);

  const integrityScore = attempt.integrityScore ?? 100;
  const riskLevel: RiskLevel = attempt.riskLevel ?? 'low';
  const riskMeta = getRiskMeta(riskLevel);
  const violationCount = Math.max(attempt.violationCount ?? 0, violations.length);

  const handleAction = async (mode: 'flag' | 'clear') => {
    setSavingAction(mode);
    try {
      await onSaveReview({
        flagged: mode === 'flag',
        cleared: mode === 'clear',
        note,
      });
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <ClayCard className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing
            value={integrityScore}
            size={68}
            strokeWidth={7}
            accent={riskMeta.accent}
            label="Session integrity score"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                Session Integrity &amp; Timeline
              </h2>
              <ClayBadge tone={riskMeta.tone}>{riskMeta.label}</ClayBadge>
              {attempt.professorFlagged && !attempt.professorFlagCleared && (
                <ClayBadge tone="coral">Flagged by Professor</ClayBadge>
              )}
              {attempt.professorFlagCleared && (
                <ClayBadge tone="mint">Flag Cleared</ClayBadge>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {attempt.proctoringEnabled
                ? `Monitored session · ${violationCount} ${
                    violationCount === 1 ? 'event' : 'events'
                  } logged · Integrity score ${integrityScore}/100`
                : 'Monitoring was not enabled for this assessment.'}
            </p>
          </div>
        </div>
      </div>

      {attempt.autoSubmitReason && (
        <div className="clay-inset flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs text-[var(--semantic-coral-text)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Auto-submitted by monitoring policy</p>
            <p className="mt-0.5 text-[var(--text-primary)]">{attempt.autoSubmitReason}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Violation Timeline ({violations.length})
        </p>
        {violations.length === 0 ? (
          <div className="clay-inset flex items-center gap-3 rounded-[18px] px-4 py-4 text-xs text-[var(--text-secondary)]">
            <ShieldCheck
              className="h-5 w-5 shrink-0 text-[var(--semantic-mint)]"
              aria-hidden="true"
            />
            <span>No monitoring violations were recorded during this attempt.</span>
          </div>
        ) : (
          <ol className="space-y-2.5" data-testid="violation-timeline-list">
            {violations.map((v) => {
              const Icon = VIOLATION_ICONS[v.type] ?? AlertTriangle;
              return (
                <li
                  key={v.id}
                  className="clay-inset flex flex-wrap items-start justify-between gap-2 rounded-[18px] px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {v.label}
                        </span>
                        <ClayBadge tone="amber">Warning #{v.strikeNumber}</ClayBadge>
                        <ClayBadge tone="neutral">Q{v.questionNumber}</ClayBadge>
                      </div>
                      {v.details && (
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{v.details}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-[11px] font-semibold text-[var(--text-muted)]">
                    {new Date(v.timestampMs).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Professor Flag / Clear Flag Review Controls */}
      <div className="clay-inset space-y-3 rounded-[20px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Professor Integrity Decision
          </p>
          {attempt.professorReviewedAtMs && (
            <span className="text-[11px] text-[var(--text-muted)]">
              Updated{' '}
              {new Date(attempt.professorReviewedAtMs).toLocaleString([], {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          )}
        </div>

        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isReadOnlyDemo}
          placeholder="Add an optional review note (e.g. verified accidental fullscreen exit, or flagged for academic review)..."
          data-testid="integrity-review-note"
          className="clay-surface-sm w-full rounded-[16px] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent-primary)]/40 disabled:opacity-70"
        />

        <div className="flex flex-wrap items-center gap-2">
          <ClayButton
            variant="danger"
            size="sm"
            leftIcon={<Flag className="h-3.5 w-3.5" aria-hidden="true" />}
            loading={savingAction === 'flag'}
            disabled={isReadOnlyDemo}
            onClick={() => void handleAction('flag')}
          >
            Flag Submission
          </ClayButton>
          <ClayButton
            variant="secondary"
            size="sm"
            leftIcon={
              <CheckCircle2
                className="h-3.5 w-3.5 text-[var(--semantic-mint)]"
                aria-hidden="true"
              />
            }
            loading={savingAction === 'clear'}
            disabled={isReadOnlyDemo}
            onClick={() => void handleAction('clear')}
          >
            Clear Flag
          </ClayButton>
          {isReadOnlyDemo && (
            <span className="text-[11px] text-[var(--text-muted)]">Demo mode is read-only.</span>
          )}
        </div>
      </div>
    </ClayCard>
  );
}
