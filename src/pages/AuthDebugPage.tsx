import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, ShieldCheck } from 'lucide-react';
import { getFirebaseEnvPresence, getFirebaseInitStatus } from '../services/firebase';
import { isRunningInIframe } from '../lib/firebaseErrors';
import { useAuthStore } from '../store/authStore';
import { ClayBadge, ClayButton, ClayCard, Logo } from '../components/ui';

export function AuthDebugPage() {
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore((s) => s.isDemo);
  const lastAuthErrorCode = useAuthStore((s) => s.lastAuthErrorCode);
  const [copied, setCopied] = useState(false);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const inIframe = isRunningInIframe();
  const initStatus = getFirebaseInitStatus();
  const envPresence = getFirebaseEnvPresence();

  const handleCopyHost = async () => {
    try {
      await navigator.clipboard.writeText(hostname);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-canvas)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Logo variant="full" size="md" />
          <Link to="/login">
            <ClayButton
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Back to Login
            </ClayButton>
          </Link>
        </div>

        <ClayCard className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-primary)]" aria-hidden="true" />
                <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  Auth Diagnostics
                </h1>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Development-only diagnostics. Environment values are never printed.
              </p>
            </div>
            <ClayBadge tone="purple">DEV ONLY</ClayBadge>
          </div>

          {/* Runtime Hostname & Iframe */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="clay-inset space-y-2 rounded-[18px] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Current Hostname
              </p>
              <div className="flex items-center justify-between gap-2">
                <code
                  data-testid="debug-hostname"
                  className="truncate text-sm font-bold font-mono-tabular text-[var(--text-primary)]"
                >
                  {hostname || 'unknown'}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyHost()}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-soft-text)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="clay-inset space-y-2 rounded-[18px] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Runtime Context
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ClayBadge tone={inIframe ? 'amber' : 'mint'}>
                  In iframe: {String(inIframe)}
                </ClayBadge>
                <ClayBadge tone={initStatus.appInitialized ? 'mint' : 'coral'}>
                  Firebase initialized: {String(initStatus.appInitialized)}
                </ClayBadge>
              </div>
            </div>
          </div>

          {/* Firebase SDK Readiness */}
          <div className="clay-inset space-y-2.5 rounded-[18px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Firebase Modules
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {(
                [
                  ['Configured', initStatus.configured],
                  ['Auth SDK', initStatus.authReady],
                  ['Firestore', initStatus.firestoreReady],
                  ['Storage', initStatus.storageReady],
                ] as const
              ).map(([label, ready]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[14px] bg-[var(--bg-surface)] px-3 py-2"
                >
                  <span className="font-semibold text-[var(--text-secondary)]">{label}</span>
                  <span
                    className={`font-mono-tabular font-bold ${
                      ready ? 'text-[var(--semantic-mint-text)]' : 'text-[var(--semantic-coral-text)]'
                    }`}
                  >
                    {String(ready)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Env Var Presence (Booleans ONLY) */}
          <div className="clay-inset space-y-2.5 rounded-[18px] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              VITE_FIREBASE_* Key Presence (Boolean Only)
            </p>
            <div className="space-y-1.5">
              {Object.entries(envPresence).map(([key, present]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-[12px] bg-[var(--bg-surface)] px-3.5 py-2 text-xs"
                >
                  <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                    {key}
                  </code>
                  <ClayBadge tone={present ? 'mint' : 'coral'}>{String(present)}</ClayBadge>
                </div>
              ))}
            </div>
          </div>

          {/* Session & Last Error Code */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="clay-inset space-y-1.5 rounded-[18px] p-4 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Session State
              </p>
              <p className="font-bold text-[var(--text-primary)]">
                {user
                  ? isDemo
                    ? `Demo Mode (${user.role})`
                    : `Signed in (${user.role})`
                  : 'Signed out'}
              </p>
            </div>
            <div className="clay-inset space-y-1.5 rounded-[18px] p-4 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Last Auth Error Code
              </p>
              <code
                data-testid="debug-last-error"
                className="font-mono-tabular font-bold text-[var(--text-primary)]"
              >
                {lastAuthErrorCode || 'none'}
              </code>
            </div>
          </div>
        </ClayCard>
      </div>
    </div>
  );
}
