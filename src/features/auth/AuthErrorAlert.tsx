import { useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';

interface AuthErrorAlertProps {
  error: string | null;
  errorCode: string | null;
}

export function AuthErrorAlert({ error, errorCode }: AuthErrorAlertProps) {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const isUnauthorizedDomain = errorCode === 'auth/unauthorized-domain';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = async () => {
    if (!currentHost) return;
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore clipboard denial
    }
  };

  if (isUnauthorizedDomain) {
    return (
      <div
        role="alert"
        data-testid="unauthorized-domain-alert"
        className="clay-inset space-y-3 rounded-[20px] bg-[var(--semantic-coral-soft)] px-4 py-3.5 text-xs text-[var(--semantic-coral-text)]"
      >
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold">Domain not authorized for Google Sign-In</p>
            <p className="leading-relaxed font-medium">
              Add this domain in Firebase Console &gt; Authentication &gt; Settings &gt; Authorized
              domains, then try again.
            </p>
          </div>
        </div>

        {currentHost && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] bg-[var(--bg-surface-elevated)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-clay-sm)]">
            <code
              data-testid="unauthorized-domain-hostname"
              className="truncate text-xs font-bold font-mono-tabular"
            >
              {currentHost}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyHostname()}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-soft-text)] transition-opacity hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="clay-inset flex items-start gap-2.5 rounded-[18px] bg-[var(--semantic-coral-soft)] px-4 py-3 text-xs font-semibold leading-relaxed text-[var(--semantic-coral-text)]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}
