import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

const toneIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

const toneColor = {
  info: 'text-[var(--accent-primary)]',
  success: 'text-[var(--semantic-mint)]',
  warning: 'text-[var(--semantic-amber)]',
  danger: 'text-[var(--semantic-coral)]',
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 lg:bottom-6 lg:right-6"
    >
      {toasts.map((toast) => {
        const Icon = toneIcons[toast.tone];
        return (
          <div
            key={toast.id}
            className="clay-card flex items-start gap-3 p-4"
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', toneColor[toast.tone])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="cursor-pointer rounded-xl p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
