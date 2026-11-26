import { AlertTriangle, Maximize2, ShieldAlert } from 'lucide-react';
import { ClayBadge, ClayButton, Modal } from '../../components/ui';
import type { ActiveProctoringWarning } from './useProctoringMonitor';

interface ProctoringWarningModalProps {
  warning: ActiveProctoringWarning | null;
  autoSubmitOnLimit: boolean;
  fullscreenRequired: boolean;
  isFullscreen: boolean;
  onContinue: () => void;
  onReenterFullscreen: () => Promise<boolean>;
}

export function ProctoringWarningModal({
  warning,
  autoSubmitOnLimit,
  fullscreenRequired,
  isFullscreen,
  onContinue,
  onReenterFullscreen,
}: ProctoringWarningModalProps) {
  if (!warning) return null;

  const remaining = Math.max(0, warning.maxStrikes - warning.strikeNumber);
  const isFinalWarning = autoSubmitOnLimit && remaining === 1;

  const handlePrimaryAction = async () => {
    if (fullscreenRequired && !isFullscreen) {
      await onReenterFullscreen();
    }
    onContinue();
  };

  return (
    <Modal
      open={Boolean(warning)}
      onClose={onContinue}
      title={`Warning ${warning.strikeNumber} of ${warning.maxStrikes}`}
      description="A monitored session event was logged for this assessment."
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 rounded-[20px] p-4 ${
            isFinalWarning
              ? 'bg-[var(--semantic-coral-soft)] text-[var(--semantic-coral-text)]'
              : 'bg-[var(--semantic-amber-soft)] text-[var(--semantic-amber-text)]'
          }`}
        >
          {isFinalWarning ? (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <div className="space-y-1.5 text-sm">
            <p className="font-bold text-[var(--text-primary)]">{warning.label}</p>
            {warning.details && (
              <p className="text-xs text-[var(--text-secondary)]">{warning.details}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <ClayBadge tone={isFinalWarning ? 'coral' : 'amber'}>
                Warning {warning.strikeNumber} of {warning.maxStrikes}
              </ClayBadge>
              <ClayBadge tone="neutral">Question #{warning.questionNumber}</ClayBadge>
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {autoSubmitOnLimit ? (
            remaining === 1 ? (
              <span className="font-semibold text-[var(--semantic-coral-text)]">
                Final warning: 1 more logged event will automatically submit your assessment with
                your saved answers.
              </span>
            ) : (
              <>
                You have <strong className="text-[var(--text-primary)]">{remaining}</strong>{' '}
                {remaining === 1 ? 'warning' : 'warnings'} remaining before this assessment is
                automatically submitted. Your timer and saved answers continue uninterrupted.
              </>
            )
          ) : (
            <>
              This event has been added to your professor&apos;s session timeline. Your timer and
              saved answers remain active.
            </>
          )}
        </p>

        <div className="flex justify-end gap-2 pt-1">
          {fullscreenRequired && !isFullscreen ? (
            <ClayButton
              variant="primary"
              size="sm"
              leftIcon={<Maximize2 className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void handlePrimaryAction()}
            >
              Return to Fullscreen &amp; Continue
            </ClayButton>
          ) : (
            <ClayButton variant="primary" size="sm" onClick={onContinue}>
              Continue Assessment
            </ClayButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
