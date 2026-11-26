import { CheckCircle2, ClipboardX, Eye, Maximize2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ClayBadge, ClayButton, ClayCard } from '../../components/ui';
import type { ProctoringPolicy } from '../../types';

interface PreTestChecklistCardProps {
  policy: ProctoringPolicy;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
}

export function PreTestChecklistCard({
  policy,
  consentChecked,
  onConsentChange,
}: PreTestChecklistCardProps) {
  const [fullscreenStatus, setFullscreenStatus] = useState<'idle' | 'ready' | 'blocked'>(() =>
    typeof document !== 'undefined' && document.fullscreenElement ? 'ready' : 'idle'
  );

  useEffect(() => {
    const syncFullscreen = () => {
      if (document.fullscreenElement) {
        setFullscreenStatus('ready');
      }
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const handleTestFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenStatus(document.fullscreenElement ? 'ready' : 'blocked');
    } catch {
      setFullscreenStatus('blocked');
    }
  };

  return (
    <ClayCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="clay-surface-sm flex h-10 w-10 items-center justify-center text-[var(--accent-primary)]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Pre-Test Monitoring Checklist
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Transparent session rules before you start your attempt
            </p>
          </div>
        </div>
        <ClayBadge tone="purple">Monitored Session</ClayBadge>
      </div>

      <div className="clay-inset rounded-[18px] p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
        <p className="font-bold text-[var(--text-primary)]">Honest monitoring notice</p>
        <p className="mt-1">
          This assessment is <strong className="text-[var(--text-primary)]">monitored</strong> (not
          cheat-proof). While you work, browser focus changes, fullscreen exits, page reloads, and
          blocked clipboard or shortcut actions are logged with timestamps for your professor&apos;s
          review.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="clay-inset flex items-start gap-2.5 rounded-[18px] px-3.5 py-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
          <div className="text-xs">
            <p className="font-bold text-[var(--text-primary)]">
              Warning Limit: {policy.maxTabSwitches}{' '}
              {policy.maxTabSwitches === 1 ? 'warning' : 'warnings'}
            </p>
            <p className="text-[var(--text-secondary)]">
              {policy.autoSubmitOnLimit
                ? 'Auto-submits your saved answers once the limit is reached.'
                : 'All warnings are recorded on your professor’s timeline.'}
            </p>
          </div>
        </div>

        <div className="clay-inset flex items-start gap-2.5 rounded-[18px] px-3.5 py-3">
          <Maximize2
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]"
            aria-hidden="true"
          />
          <div className="text-xs">
            <p className="font-bold text-[var(--text-primary)]">
              {policy.fullscreenRequired ? 'Fullscreen Required' : 'Fullscreen Optional'}
            </p>
            <p className="text-[var(--text-secondary)]">
              {policy.fullscreenRequired
                ? 'Exiting fullscreen logs a warning during the session.'
                : 'Fullscreen is recommended to avoid accidental focus loss.'}
            </p>
          </div>
        </div>

        <div className="clay-inset flex items-start gap-2.5 rounded-[18px] px-3.5 py-3 sm:col-span-2">
          <ClipboardX
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]"
            aria-hidden="true"
          />
          <div className="text-xs">
            <p className="font-bold text-[var(--text-primary)]">
              {policy.blockCopyPaste
                ? 'Copy, paste, cut, right-click & restricted shortcuts blocked'
                : 'Developer shortcuts (F12 / PrintScreen) monitored'}
            </p>
            <p className="text-[var(--text-secondary)]">
              Reloading the page mid-test is logged, though your timer and saved answers remain
              protected.
            </p>
          </div>
        </div>
      </div>

      {policy.fullscreenRequired && (
        <div className="clay-inset flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3">
          <div className="flex items-center gap-2.5 text-xs">
            {fullscreenStatus === 'ready' ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-[var(--semantic-mint)]"
                aria-hidden="true"
              />
            ) : (
              <Maximize2
                className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-bold text-[var(--text-primary)]">Fullscreen permission check</p>
              <p className="text-[var(--text-secondary)]">
                {fullscreenStatus === 'ready'
                  ? 'Fullscreen is active and ready.'
                  : fullscreenStatus === 'blocked'
                    ? 'Browser or embedded frame blocked fullscreen test — you can still begin; fullscreen will be requested on start.'
                    : 'Verify fullscreen works cleanly before the timer begins.'}
              </p>
            </div>
          </div>
          <ClayButton
            type="button"
            variant={fullscreenStatus === 'ready' ? 'secondary' : 'primary'}
            size="sm"
            leftIcon={<Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void handleTestFullscreen()}
          >
            {fullscreenStatus === 'ready' ? 'Fullscreen Active' : 'Check Fullscreen'}
          </ClayButton>
        </div>
      )}

      <label
        htmlFor="proctoring-consent-checkbox"
        className="clay-inset flex cursor-pointer items-start gap-3 rounded-[18px] p-4"
      >
        <input
          id="proctoring-consent-checkbox"
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--accent-primary)]"
          data-testid="proctoring-consent-checkbox"
        />
        <span className="text-xs font-semibold leading-relaxed text-[var(--text-primary)]">
          I understand this assessment is monitored and consent to browser focus, fullscreen,
          reload, and clipboard events being logged for my professor during this attempt.
        </span>
      </label>
    </ClayCard>
  );
}
